import { unstable_cache } from "next/cache";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { searchOrFilters } from "@/lib/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateStockStatus, stockStatus } from "@/lib/stock";
import type { CatalogSort } from "@/features/catalog/sorting";
import type {
  Category,
  Gender,
  OlfactoryFamily,
  ProductType,
  StockStatusLike,
} from "@/features/catalog/types";

type RawVariant = {
  id: string;
  label: string;
  volume_ml: number | null;
  variant_type: "full" | "decant";
  price_cents: number | null;
  stock_quantity: number;
  sort_order: number;
  active: boolean;
};

type RawImage = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  gender: Gender | null;
  product_type: ProductType;
  description: string | null;
  promotional: boolean;
  olfactory_family_id: string | null;
  showcase_order: number | null;
  categories: { name: string; slug: string } | null;
  olfactory_families: { name: string; slug: string } | null;
  product_olfactory_families: Array<{
    olfactory_families: { name: string; slug: string } | null;
  }>;
  product_variants: RawVariant[];
  product_images: RawImage[];
};

const PRODUCT_SELECT = `
  id, name, slug, brand, gender, product_type, description, promotional,
  olfactory_family_id, showcase_order,
  categories ( name, slug ),
  olfactory_families:olfactory_families!products_olfactory_family_id_fkey ( name, slug ),
  product_olfactory_families (
    olfactory_families ( name, slug )
  ),
  product_variants ( id, label, volume_ml, variant_type, price_cents, stock_quantity, sort_order, active ),
  product_images ( storage_path, alt_text, sort_order )
`;

export type ProductCard = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryName: string | null;
  gender: Gender | null;
  promotional: boolean;
  fromPriceCents: number | null;
  stock: StockStatusLike;
  imagePath: string | null;
  imageAlt: string | null;
  images: { path: string; alt: string | null }[];
  variantCount: number;
  showcaseOrder: number | null;
};

export type ProductVariantPublic = {
  id: string;
  label: string;
  volumeMl: number | null;
  variantType: "full" | "decant";
  priceCents: number;
  stock: StockStatusLike;
  maxQuantity: number;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  gender: Gender | null;
  productType: ProductType;
  description: string | null;
  familyName: string | null;
  images: { path: string; alt: string | null }[];
  variants: ProductVariantPublic[];
};

function sortedActiveVariants(
  raw: RawProduct,
): Array<RawVariant & { price_cents: number }> {
  return raw.product_variants
    .filter(
      (variant): variant is RawVariant & { price_cents: number } =>
        variant.active && variant.price_cents !== null,
    )
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.price_cents - b.price_cents,
    );
}

function toCard(raw: RawProduct): ProductCard {
  const variants = sortedActiveVariants(raw);
  const inStock = variants.filter((variant) => variant.stock_quantity > 0);

  const pricePool = inStock.length > 0 ? inStock : variants;
  const fromPriceCents =
    pricePool.length > 0
      ? Math.min(...pricePool.map((variant) => variant.price_cents))
      : null;

  const images = [...raw.product_images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const cover = images[0] ?? null;

  return {
    description: raw.description,
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    brand: raw.brand,
    categoryName: raw.categories?.name ?? null,
    gender: raw.gender,
    promotional: raw.promotional,
    fromPriceCents,
    stock: aggregateStockStatus(
      variants.map((variant) => variant.stock_quantity),
    ),
    imagePath: cover?.storage_path ?? null,
    imageAlt: cover?.alt_text ?? null,
    images: images.map((image) => ({
      path: image.storage_path,
      alt: image.alt_text,
    })),
    variantCount: variants.length,
    showcaseOrder: raw.showcase_order ?? null,
  };
}

function toDetail(raw: RawProduct): ProductDetail {
  const familyNames = raw.product_olfactory_families
    .map((relation) => relation.olfactory_families?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    brand: raw.brand,
    categoryName: raw.categories?.name ?? null,
    categorySlug: raw.categories?.slug ?? null,
    gender: raw.gender,
    productType: raw.product_type,
    description: raw.description,
    familyName:
      familyNames.length > 0
        ? familyNames.join(", ")
        : raw.olfactory_families?.name ?? null,
    images: [...raw.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({
        path: image.storage_path,
        alt: image.alt_text,
      })),
    variants: sortedActiveVariants(raw).map((variant) => ({
      id: variant.id,
      label: variant.label,
      volumeMl: variant.volume_ml,
      variantType: variant.variant_type,
      priceCents: variant.price_cents,
      stock: stockStatus(variant.stock_quantity),
      maxQuantity: variant.stock_quantity,
    })),
  };
}

export type CatalogFilters = {
  q?: string;
  categoria?: string;
  genero?: string;
  familia?: string;
  precoMin?: number | null;
  precoMax?: number | null;
};

function matchesPriceRange(
  priceCents: number | null,
  min?: number | null,
  max?: number | null,
) {
  if (min == null && max == null) return true;
  if (priceCents == null) return false;
  if (min != null && priceCents < min) return false;
  if (max != null && priceCents > max) return false;

  return true;
}

function byName(a: ProductCard, b: ProductCard) {
  return a.name.localeCompare(b.name, "pt-BR");
}

function byPrice(direction: 1 | -1) {
  return (a: ProductCard, b: ProductCard) => {
    const left = a.fromPriceCents;
    const right = b.fromPriceCents;

    if (left == null && right == null) return byName(a, b);
    if (left == null) return 1;
    if (right == null) return -1;

    return left === right
      ? byName(a, b)
      : (left - right) * direction;
  };
}

function byShowcase(a: ProductCard, b: ProductCard) {
  const left = a.showcaseOrder;
  const right = b.showcaseOrder;

  if (left == null && right == null) return byName(a, b);
  if (left == null) return 1;
  if (right == null) return -1;

  return left === right ? byName(a, b) : left - right;
}

function sortProducts(products: ProductCard[], sort: CatalogSort) {
  const ordered = [...products];

  switch (sort) {
    case "preco-asc":
      return ordered.sort(byPrice(1));
    case "preco-desc":
      return ordered.sort(byPrice(-1));
    case "nome":
      return ordered.sort(byName);
    default:
      return ordered.sort(byShowcase);
  }
}

export const CATALOG_PAGE_SIZE = 16;

export type CatalogPage = {
  products: ProductCard[];
  total: number;
};

export async function getCatalogProducts(
  filters: CatalogFilters,
  page = 1,
  pageSize = CATALOG_PAGE_SIZE,
  sort: CatalogSort = "padrao",
): Promise<CatalogPage> {
  const supabase = await createClient();

  let categoryId: string | null = null;
  let familyProductIds: string[] | null = null;

  if (filters.categoria) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categoria)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { products: [], total: 0 };

    categoryId = data.id;
  }

  if (filters.familia) {
    const { data, error } = await supabase
      .from("olfactory_families")
      .select("id")
      .eq("slug", filters.familia)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { products: [], total: 0 };

    const { data: relations, error: relationsError } = await supabase
      .from("product_olfactory_families")
      .select("product_id")
      .eq("olfactory_family_id", data.id);

    if (relationsError) {
      throw new Error(relationsError.message);
    }

    familyProductIds = (relations ?? []).map(
      (relation) => relation.product_id,
    );

    if (familyProductIds.length === 0) {
      return { products: [], total: 0 };
    }
  }

  const applyFilters = <
    T extends {
      or: (filters: string) => T;
      in: (column: string, values: string[]) => T;
      eq: (column: string, value: string) => T;
    },
  >(
    builder: T,
  ): T => {
    let next = builder;

    for (const filter of searchOrFilters(filters.q ?? "")) {
      next = next.or(filter);
    }

    if (
      filters.genero === "feminino" ||
      filters.genero === "masculino"
    ) {
      next = next.in("gender", [filters.genero, "unissex"]);
    }

    if (categoryId) {
      next = next.eq("category_id", categoryId);
    }

    if (familyProductIds) {
      next = next.in("id", familyProductIds);
    }

    return next;
  };

  const { data, error } = await applyFilters(
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .order("name"),
  );

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawProduct[];

  const all = rows
    .filter((row) => row.product_variants.length > 0)
    .map(toCard);

  const withinRange = all.filter((product) =>
    matchesPriceRange(
      product.fromPriceCents,
      filters.precoMin,
      filters.precoMax,
    ),
  );

  const ordered = sortProducts(withinRange, sort);

  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.max(1, Math.trunc(pageSize));
  const from = (safePage - 1) * safePageSize;

  return {
    products: ordered.slice(from, from + safePageSize),
    total: ordered.length,
  };
}

export async function getFeaturedProducts(
  limit = 8,
): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((row) => row.product_variants.length > 0)
    .map(toCard);
}

export async function getFeaturedPerfumes(
  limit = 8,
): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .in("product_type", ["perfume", "body_splash"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((row) => row.product_variants.length > 0)
    .map(toCard);
}

export async function getBestSellingProducts(
  limit = 8,
): Promise<ProductCard[]> {
  try {
    const admin = createAdminClient();

    const { data: paidOrders } = await admin
      .from("orders")
      .select("id")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(250);

    const orderIds = (paidOrders ?? []).map((order) => order.id);

    if (orderIds.length === 0) {
      return [];
    }

    const { data: items } = await admin
      .from("order_items")
      .select("product_id, quantity")
      .in("order_id", orderIds);

    const totals = new Map<string, number>();

    for (const item of items ?? []) {
      if (!item.product_id) continue;

      totals.set(
        item.product_id,
        (totals.get(item.product_id) ?? 0) + item.quantity,
      );
    }

    const rankedIds = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (rankedIds.length === 0) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .in("id", rankedIds);

    if (error) throw new Error(error.message);

    const byId = new Map(
      ((data ?? []) as unknown as RawProduct[])
        .filter((row) => row.product_variants.length > 0)
        .map((row) => [row.id, toCard(row)] as const),
    );

    return rankedIds
      .map((id) => byId.get(id))
      .filter(
        (product): product is ProductCard => Boolean(product),
      );
  } catch {
    return [];
  }
}

export async function getNewProducts(
  limit = 8,
): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((row) => row.product_variants.length > 0)
    .map(toCard);
}

const POOL_MAX = 60;
const POOL_WINDOW_MS = 60_000;

export async function getProductPool(
  limit = POOL_MAX,
): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const total = count ?? 0;

  let from = 0;

  if (total > limit) {
    const windows = Math.ceil(total / limit);

    from =
      (Math.floor(Date.now() / POOL_WINDOW_MS) % windows) * limit;
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((row) => row.product_variants.length > 0)
    .map(toCard);
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return toDetail(data as unknown as RawProduct);
}

export async function getProductSlugs(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("active", true);

  return (data ?? []).map((row) => row.slug);
}

export const CATEGORIES_TAG = "categorias-ativas";

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .order("sort_order");

    if (error) throw new Error(error.message);

    return (data ?? []) as Category[];
  },
  [CATEGORIES_TAG],
  {
    revalidate: 300,
    tags: [CATEGORIES_TAG],
  },
);

export async function getOlfactoryFamilies(): Promise<
  OlfactoryFamily[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("olfactory_families")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  if (error) throw new Error(error.message);

  return (data ?? []) as OlfactoryFamily[];
}

export async function getShowcaseProducts(): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((row) => row.product_variants.length > 0)
    .map(toCard)
    .sort(byShowcase);
}