import type { ProductType } from "@/types/database";

export type ProductCategorySlug =
  | "perfumes"
  | "body-splash"
  | "body-cream"
  | "cosmeticos";

/** Regra comercial única para os cadastros manual e em lote. */
export function categorySlugForProductType(
  productType: ProductType | null,
): ProductCategorySlug | null {
  if (productType === "perfume") return "perfumes";
  if (productType === "body_splash") return "body-splash";
  if (productType === "body_cream") return "body-cream";
  if (productType === "cosmetico") return "cosmeticos";
  return null;
}

/** Mantém categoria e tipo sincronizados no cadastro manual. */
export function productTypeForCategorySlug(
  categorySlug: string | null,
): ProductType | null {
  if (categorySlug === "perfumes") return "perfume";
  if (categorySlug === "body-splash") return "body_splash";
  if (categorySlug === "body-cream") return "body_cream";
  if (categorySlug === "cosmeticos") return "cosmetico";
  return null;
}
