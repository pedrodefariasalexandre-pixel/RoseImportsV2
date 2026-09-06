import type { ProductType } from "@/types/database";

export type ProductCategorySlug =
  | "perfumes"
  | "body-splash"
  | "body-cream";

/** Regra comercial única para os cadastros manual e em lote. */
export function categorySlugForProductType(
  productType: ProductType | null,
): ProductCategorySlug | null {
  if (productType === "perfume") return "perfumes";
  if (productType === "body_splash") return "body-splash";
  if (productType === "body_cream") return "body-cream";
  return null;
}
