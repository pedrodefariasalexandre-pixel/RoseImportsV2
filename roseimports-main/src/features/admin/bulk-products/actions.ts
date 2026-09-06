"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeBulkProductRecords,
  findCatalogDuplicateIndexes,
  findRepeatedImportIndexes,
  type BulkProductAnalysis,
} from "./dedupe";
import {
  mapCatalogCandidates,
  type CatalogProductRow,
} from "./catalog-candidates";
import { loadCatalogWithLegacyFallback } from "./catalog-loader";
import { translateBulkImportError } from "./error-messages";
import {
  confirmBulkProductImport,
  type BulkProductImportRpcClient,
  type BulkProductImportSummary,
} from "./import-service";
import {
  parseBulkProducts,
} from "./parser";
import {
  analyzeBulkProductsSchema,
  confirmBulkProductsSchema,
  type ConfirmBulkProductsInput,
} from "./schemas";

type CategoryRow = {
  id: string;
  slug: string;
};

type OlfactoryFamilyRow = {
  id: string;
  name: string;
};

export type BulkProductAnalysisWithCategory = BulkProductAnalysis & {
  categoryId: string | null;
};

export type AnalyzeBulkProductsResult =
  | {
      ok: true;
      items: BulkProductAnalysisWithCategory[];
      categoryIds: {
        perfumes: string | null;
        "body-splash": string | null;
        "body-cream": string | null;
        cosmeticos: string | null;
      };
      confirmationAvailable: boolean;
      schemaMode: "full" | "legacy";
      olfactoryFamilies: OlfactoryFamilyRow[];
    }
  | {
      ok: false;
      error: string;
    };

export type ConfirmBulkProductsResult =
  | {
      ok: true;
      message: string;
      summary: BulkProductImportSummary;
    }
  | {
      ok: false;
      error: string;
    };

export async function analyzeBulkProducts(
  input: string,
): Promise<AnalyzeBulkProductsResult> {
  await requireAdminUser();

  const parsedInput = analyzeBulkProductsSchema.safeParse({ input });

  if (!parsedInput.success) {
    return { ok: false, error: "Cole ao menos uma linha de produto válida." };
  }

  const records = parseBulkProducts(parsedInput.data.input);

  if (records.length === 0) {
    return { ok: false, error: "Nenhum produto foi identificado na lista." };
  }

  const supabase = await createClient();
  const [catalogResult, categoriesResult, familiesResult] = await Promise.all([
    loadCatalogWithLegacyFallback(
      async () => {
        const result = await supabase.from("products").select(`
          id,
          name,
          slug,
          brand,
          product_type,
          product_variants (
            id,
            label,
            volume_ml,
            variant_type,
            concentration,
            is_kit,
            product_variant_kit_items (
              component_type,
              component_name,
              volume_ml,
              component_quantity,
              sort_order
            )
          )
        `);
        return {
          data: result.data as unknown as CatalogProductRow[] | null,
          error: result.error,
        };
      },
      async () => {
        const result = await supabase.from("products").select(`
          id,
          name,
          slug,
          brand,
          product_type,
          product_variants (
            id,
            label,
            volume_ml,
            variant_type
          )
        `);
        return {
          data: result.data as unknown as CatalogProductRow[] | null,
          error: result.error,
        };
      },
    ),
    supabase.from("categories").select("id, slug").eq("active", true),
    supabase
      .from("olfactory_families")
      .select("id, name")
      .order("sort_order"),
  ]);

  if (catalogResult.error || categoriesResult.error || familiesResult.error) {
    return {
      ok: false,
      error: "Não foi possível comparar a lista com o catálogo.",
    };
  }

  const catalog = mapCatalogCandidates(catalogResult.data ?? []);
  const categoryBySlug = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [
      category.slug,
      category.id,
    ]),
  );
  const usedSlugs = new Set(
    (catalogResult.data ?? []).map((product) => product.slug),
  );
  const analyses = analyzeBulkProductRecords(records, catalog).map((item) => {
    const slug =
      item.status !== "existing_product"
        ? reserveUniqueSlug(item.slug, usedSlugs)
        : item.slug;

    return {
      ...item,
      slug,
      categoryId: resolveCategoryId(item.categorySlug, categoryBySlug),
    };
  });

  return {
    ok: true,
    items: analyses,
    categoryIds: {
      perfumes: categoryBySlug.get("perfumes") ?? null,
      "body-splash": categoryBySlug.get("body-splash") ?? null,
      "body-cream": categoryBySlug.get("body-cream") ?? null,
      cosmeticos: categoryBySlug.get("cosmeticos") ?? null,
    },
    confirmationAvailable: catalogResult.mode === "full",
    schemaMode: catalogResult.mode,
    olfactoryFamilies: (familiesResult.data ?? []) as OlfactoryFamilyRow[],
  };
}

export async function confirmBulkProducts(
  request: ConfirmBulkProductsInput,
): Promise<ConfirmBulkProductsResult> {
  await requireAdminUser();

  const parsed = confirmBulkProductsSchema.safeParse(request);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados de confirmação inválidos.",
    };
  }

  const supabase = await createClient();
  const catalogCreations = parsed.data.items.filter(
    (item) =>
      item.action === "create_inactive_product" ||
      item.action === "create_product_with_sale_data" ||
      item.action === "create_inactive_variant",
  );

  if (catalogCreations.length > 0) {
    const catalogResult = await loadCatalogForDuplicateCheck(supabase);

    if (catalogResult.error) {
      return {
        ok: false,
        error:
          "Não foi possível verificar duplicidades no catálogo. Nenhuma alteração foi feita; tente analisar o lote novamente.",
      };
    }

    const duplicateIndexes = [
      ...new Set([
        ...findCatalogDuplicateIndexes(
          catalogCreations,
          mapCatalogCandidates(catalogResult.data ?? []),
        ),
        ...findRepeatedImportIndexes(catalogCreations),
      ]),
    ];

    if (duplicateIndexes.length > 0) {
      const duplicateNames = duplicateIndexes.map(
        (index) => catalogCreations[index]?.name ?? `Item ${index + 1}`,
      );
      return {
        ok: false,
        error: `${duplicateNames.length === 1 ? "Este produto ou versão já existe" : "Estes produtos ou versões já existem"} no catálogo: ${duplicateNames.join(", ")}. Analise o lote novamente para usar o registro existente. Nenhuma alteração foi feita.`,
      };
    }
  }

  const payloadHash = `sha256:${createHash("sha256")
    .update(JSON.stringify(parsed.data.items))
    .digest("hex")}`;
  try {
    const summary = await confirmBulkProductImport(
      supabase as unknown as BulkProductImportRpcClient,
      {
        idempotencyKey: parsed.data.idempotencyKey,
        payloadHash,
        items: parsed.data.items,
      },
    );

    revalidatePath("/admin/produtos");
    revalidatePath("/admin/estoque");
    revalidatePath("/catalogo");

    return {
      ok: true,
      message: "Lote cadastrado com sucesso.",
      summary,
    };
  } catch (error) {
    console.error("Falha ao confirmar cadastro em lote", error);
    return {
      ok: false,
      error: translateBulkImportError(
        error instanceof Error ? error.message : "unknown_bulk_import_error",
      ),
    };
  }
}

async function loadCatalogForDuplicateCheck(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  return loadCatalogWithLegacyFallback(
    async () => {
      const result = await supabase.from("products").select(`
        id,
        name,
        slug,
        brand,
        product_type,
        product_variants (
          id,
          label,
          volume_ml,
          variant_type,
          concentration,
          is_kit,
          product_variant_kit_items (
            component_type,
            component_name,
            volume_ml,
            component_quantity,
            sort_order
          )
        )
      `);
      return {
        data: result.data as unknown as CatalogProductRow[] | null,
        error: result.error,
      };
    },
    async () => {
      const result = await supabase.from("products").select(`
        id,
        name,
        slug,
        brand,
        product_type,
        product_variants (
          id,
          label,
          volume_ml,
          variant_type
        )
      `);
      return {
        data: result.data as unknown as CatalogProductRow[] | null,
        error: result.error,
      };
    },
  );
}

function resolveCategoryId(
  categorySlug: BulkProductAnalysis["categorySlug"],
  categoryBySlug: Map<string, string>,
): string | null {
  if (!categorySlug) return null;
  return categoryBySlug.get(categorySlug) ?? null;
}

function reserveUniqueSlug(baseSlug: string, usedSlugs: Set<string>): string {
  let candidate = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    const suffixText = `-${suffix}`;
    candidate = `${baseSlug.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}
