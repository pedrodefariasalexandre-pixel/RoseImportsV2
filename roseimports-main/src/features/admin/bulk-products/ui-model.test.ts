import { describe, expect, it } from "vitest";

import type { BulkProductAnalysis } from "./dedupe";
import {
  buildConfirmItems,
  createEditableItems,
  duplicateEditableItem,
  getItemConfirmationBlockers,
  isItemConfirmable,
  mergeReanalyzedItems,
  type EditableBulkProduct,
} from "./ui-model";

function analysis(
  overrides: Partial<BulkProductAnalysis & { categoryId: string | null }> = {},
): BulkProductAnalysis & { categoryId: string | null } {
  return {
    source: "Lattafa Jasoor EDP 100 ml",
    sourceLine: 1,
    name: "Lattafa Jasoor",
    brand: "Lattafa",
    line: "Jasoor",
    concentration: "EDP",
    productType: "perfume",
    gender: "masculino",
    categorySlug: "perfumes",
    variantType: "full",
    variantLabel: "100 ml",
    volumeMl: 100,
    quantity: 2,
    isKit: false,
    components: [],
    variations: [],
    normalizedName: "lattafa jasoor",
    slug: "lattafa-jasoor",
    issues: [],
    status: "new_product",
    proposedAction: "create_inactive_product",
    matchedProductId: null,
    matchedVariantId: null,
    requiresPriceReview: true,
    candidates: [],
    reasons: [],
    categoryId: "90000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

const categoryIds = {
  perfumes: "90000000-0000-4000-8000-000000000001",
  "body-splash": "90000000-0000-4000-8000-000000000002",
  "body-cream": "90000000-0000-4000-8000-000000000003",
};

describe("modelo da revisão do cadastro em lote", () => {
  it("prepara produtos novos e ignora duplicidades completas automaticamente", () => {
    const items = createEditableItems([
      analysis(),
      analysis({
        status: "existing_product",
        proposedAction: null,
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
      analysis({
        status: "possible_duplicate",
        proposedAction: null,
      }),
      analysis({
        status: "incomplete",
        proposedAction: null,
      }),
    ]);

    expect(items.map((item) => item.selected)).toEqual([true, false, false, false]);
    expect(items.map((item) => item.decision.type)).toEqual([
      "create_product_with_sale_data",
      "skip",
      "review",
      "review",
    ]);
    expect(items[0]?.availableForSale).toBe(true);
    expect(items[0]?.priceCents).toBe(30_000);
  });

  it("não libera dado incompleto sem edição e decisão manual", () => {
    const [item] = createEditableItems([
      analysis({
        status: "incomplete",
        proposedAction: null,
        reasons: ["shared_quantity_between_variations"],
      }),
    ]);
    expect(item).toBeDefined();
    expect(isItemConfirmable(item!, categoryIds)).toBe(false);

    const resolved: EditableBulkProduct = {
      ...item!,
      name: "Yara Tous",
      quantity: 4,
      selected: true,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 30_000,
      availableForSale: true,
    };
    expect(isItemConfirmable(resolved, categoryIds)).toBe(true);
  });

  it("converte decisões explícitas no payload transacional", () => {
    const items = createEditableItems([
      analysis(),
      analysis({
        status: "existing_product",
        proposedAction: null,
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
    ]);
    const payload = buildConfirmItems(items, categoryIds);

    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      action: "create_product_with_sale_data",
      name: "LATTAFA JASOOR",
      brand: "Lattafa",
      categoryId: categoryIds.perfumes,
      productType: "perfume",
      gender: "masculino",
      variantLabel: "100 ml",
      quantity: 2,
      priceCents: 30_000,
      availableForSale: true,
    });
    expect(payload).not.toContainEqual(
      expect.objectContaining({ action: "increment_existing_variant" }),
    );
  });

  it("não exige campos nem gera payload para duplicidade completa", () => {
    const [item] = createEditableItems([
      analysis({
        brand: null,
        categorySlug: null,
        productType: null,
        gender: null,
        volumeMl: null,
        status: "existing_product",
        proposedAction: null,
        matchedProductId: "10000000-0000-4000-8000-000000000001",
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
    ]);

    expect(item).toMatchObject({
      selected: false,
      decision: { type: "skip" },
    });
    expect(getItemConfirmationBlockers(item!, categoryIds)).toContain(
      "item_skipped",
    );
    expect(buildConfirmItems([item!], categoryIds)).toEqual([]);
  });

  it("bloqueia confirmação quando qualquer campo obrigatório está ausente", () => {
    const missingCases: Array<Partial<BulkProductAnalysis>> = [
      { name: "" },
      { brand: null },
      { categorySlug: null },
      { productType: null },
      { gender: null },
    ];

    for (const missing of missingCases) {
      const [item] = createEditableItems([analysis(missing)]);
      expect(isItemConfirmable(item!, categoryIds)).toBe(false);
    }
  });

  it("informa exatamente o que falta para liberar a ação", () => {
    const [item] = createEditableItems([
      analysis({
        brand: null,
        gender: null,
        status: "incomplete",
        proposedAction: null,
      }),
    ]);

    expect(
      getItemConfirmationBlockers(
        {
          ...item!,
          selected: true,
          decision: { type: "create_product_with_sale_data" },
          priceCents: 30_000,
          availableForSale: true,
        },
        categoryIds,
      ),
    ).toEqual(["brand_missing", "gender_missing"]);
    expect(item?.quickFixFields).toEqual(["brand", "gender"]);
  });

  it("leva todos os campos obrigatórios ausentes para a correção rápida", () => {
    const [item] = createEditableItems([
      analysis({
        name: "",
        brand: null,
        productType: null,
        categorySlug: null,
        gender: null,
        volumeMl: null,
        quantity: 0,
        status: "incomplete",
        proposedAction: null,
      }),
    ]);

    expect(item?.quickFixFields).toEqual([
      "name",
      "brand",
      "product_type",
      "category",
      "gender",
      "volume",
      "quantity",
    ]);
  });

  it("exige disponibilidade para venda mesmo quando há preço", () => {
    const [item] = createEditableItems([analysis()]);
    const base: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 30_000,
      availableForSale: false,
    };

    expect(getItemConfirmationBlockers(base, categoryIds)).toEqual([
      "sale_availability_required",
    ]);
  });

  it("não permite cadastrar produto novo pelo caminho inativo legado", () => {
    const [item] = createEditableItems([analysis()]);
    const inactive: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product" },
      availableForSale: false,
    };

    expect(getItemConfirmationBlockers(inactive, categoryIds)).toContain(
      "sale_data_required",
    );
    expect(isItemConfirmable(inactive, categoryIds)).toBe(false);
  });

  it("regenera o slug a partir do nome editado do produto novo", () => {
    const [item] = createEditableItems([analysis()]);
    const edited = {
      ...item!,
      name: "Café Árabe Nº 10",
      priceCents: 30_000,
    };

    expect(buildConfirmItems([edited], categoryIds)[0]).toMatchObject({
      action: "create_product_with_sale_data",
      name: "CAFÉ ÁRABE Nº 10",
      slug: "cafe-arabe-n-10",
    });
  });

  it("normaliza em maiúsculas o nome enviado ao criar variante", () => {
    const [item] = createEditableItems([
      analysis({
        name: "Lattafa Jasoor",
        status: "existing_product",
        proposedAction: "create_inactive_variant",
        matchedProductId: "10000000-0000-4000-8000-000000000001",
        matchedVariantId: null,
      }),
    ]);

    const selected = {
      ...item!,
      selected: true,
      decision: {
        type: "create_variant" as const,
        productId: "10000000-0000-4000-8000-000000000001",
      },
    };

    expect(buildConfirmItems([selected], categoryIds)[0]).toMatchObject({
      name: "LATTAFA JASOOR",
    });
  });

  it("cria variante com preço para venda, mas mantém a publicação dependente de foto", () => {
    const [item] = createEditableItems([analysis()]);
    const ready: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 30_000,
      availableForSale: true,
      description: "Fragrância informada pela administradora.",
      featured: true,
    };

    expect(buildConfirmItems([ready], categoryIds)[0]).toMatchObject({
      action: "create_product_with_sale_data",
      priceCents: 30_000,
      availableForSale: true,
      description: "Fragrância informada pela administradora.",
      featured: true,
      promotional: false,
    });
  });

  it("não libera preço e estoque sem um preço real", () => {
    const [item] = createEditableItems([analysis()]);
    const incomplete: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product_with_sale_data" },
      priceCents: null,
      availableForSale: true,
    };

    expect(isItemConfirmable(incomplete, categoryIds)).toBe(false);
  });

  it("ignora por completo uma linha descartada mesmo em estado antigo inconsistente", () => {
    const [item] = createEditableItems([
      analysis({
        name: "",
        brand: null,
        gender: null,
        status: "incomplete",
        proposedAction: null,
      }),
    ]);

    expect(
      buildConfirmItems(
        [
          {
            ...item!,
            selected: true,
            decision: { type: "skip" },
          },
        ],
        categoryIds,
      ),
    ).toEqual([]);
  });

  it("descarta automaticamente uma repetição dentro do mesmo lote", () => {
    const [item] = createEditableItems([
      analysis({
        status: "possible_duplicate",
        proposedAction: null,
        reasons: ["duplicate_in_batch"],
      }),
    ]);

    expect(item).toMatchObject({
      selected: false,
      decision: { type: "skip" },
    });
  });

  it("impõe BODY SPLASH e BODY CREAM no nome antes da confirmação", () => {
    const [bodySplash, bodyCream] = createEditableItems([
      analysis({
        source: "V.V. LOVE ETHEREAL MUSE, 250 ML",
        name: "V.V. LOVE ETHEREAL MUSE",
        brand: "V.V. Love",
        productType: "body_splash",
        categorySlug: "body-splash",
        categoryId: categoryIds["body-splash"],
        volumeMl: 250,
      }),
      analysis({
        source: "BODY CREAM DELILAH BLANC, 200 ML",
        sourceLine: 2,
        name: "DELILAH BLANC",
        brand: "Isabelle La Belle",
        productType: "body_cream",
        categorySlug: "body-cream",
        categoryId: categoryIds["body-cream"],
        volumeMl: 200,
      }),
    ]);

    const payload = buildConfirmItems([bodySplash!, bodyCream!], categoryIds);
    expect(payload[0]).toMatchObject({
      name: "V.V. LOVE ETHEREAL MUSE BODY SPLASH",
      slug: "v-v-love-ethereal-muse-body-splash",
      productType: "body_splash",
    });
    expect(payload[1]).toMatchObject({
      name: "DELILAH BLANC BODY CREAM",
      slug: "delilah-blanc-body-cream",
      productType: "body_cream",
    });
  });

  it("preserva as edições manuais ao reanalisar e aplica uma duplicidade recém-detectada", () => {
    const [initial] = createEditableItems([
      analysis({ status: "incomplete", proposedAction: null, gender: null }),
    ]);
    const edited: EditableBulkProduct = {
      ...initial!,
      gender: "masculino",
      description: "Texto revisado pela administradora.",
      selected: true,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 30_000,
      availableForSale: true,
    };

    const [reanalyzed] = mergeReanalyzedItems([edited], [
      analysis({
        status: "existing_product",
        proposedAction: null,
        matchedProductId: "10000000-0000-4000-8000-000000000001",
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
    ]);

    expect(reanalyzed).toMatchObject({
      gender: "masculino",
      description: "Texto revisado pela administradora.",
      selected: false,
      decision: { type: "skip" },
      status: "existing_product",
    });
  });

  it("não reaproveita dados do lote anterior quando a linha de origem mudou", () => {
    const [initial] = createEditableItems([
      analysis({ source: "PRODUTO ANTIGO", name: "PRODUTO ANTIGO" }),
    ]);
    const edited: EditableBulkProduct = {
      ...initial!,
      name: "EDIÇÃO QUE NÃO PODE VAZAR",
      quantity: 99,
      selected: true,
    };

    const [reanalyzed] = mergeReanalyzedItems([edited], [
      analysis({
        source: "PRODUTO NOVO",
        name: "PRODUTO NOVO",
        quantity: 1,
      }),
    ]);

    expect(reanalyzed).toMatchObject({
      source: "PRODUTO NOVO",
      name: "PRODUTO NOVO",
      quantity: 1,
    });
    expect(reanalyzed?.name).not.toBe("EDIÇÃO QUE NÃO PODE VAZAR");
  });

  it("duplica agrupamento para permitir distribuição manual sem confirmá-lo", () => {
    const [item] = createEditableItems([
      analysis({
        status: "incomplete",
        proposedAction: null,
        variations: ["Yara Tous", "Yara Candy"],
      }),
    ]);
    const duplicate = duplicateEditableItem(item!, "manual-copy");

    expect(duplicate.clientId).toBe("manual-copy");
    expect(duplicate.selected).toBe(false);
    expect(duplicate.decision).toEqual({ type: "review" });
  });
});
