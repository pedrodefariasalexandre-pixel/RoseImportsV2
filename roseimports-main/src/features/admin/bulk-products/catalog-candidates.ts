import {
  normalizeIdentity,
  removeBrandFromIdentity,
  type CatalogProductCandidate,
} from "./dedupe";
import {
  normalizeProductIdentityFromDescription,
  type BulkProductType,
} from "./parser";

export type CatalogKitItemRow = {
  component_type: string;
  component_name: string | null;
  volume_ml: number | null;
  component_quantity: number | null;
  sort_order: number;
};

export type CatalogVariantRow = {
  id: string;
  label: string;
  volume_ml: number | null;
  variant_type: "full" | "decant";
  concentration?: "EDP" | "EDT" | "Parfum" | null;
  is_kit?: boolean;
  product_variant_kit_items?: CatalogKitItemRow[];
};

export type CatalogProductRow = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  product_type: BulkProductType;
  product_variants: CatalogVariantRow[];
};

export function mapCatalogCandidates(
  rows: CatalogProductRow[],
): CatalogProductCandidate[] {
  return rows.map((product) => {
    const normalizedName = normalizeProductIdentityFromDescription(
      product.name,
      product.product_type,
    );
    const normalizedBrand = normalizeIdentity(product.brand ?? "");

    return {
      productId: product.id,
      name: product.name,
      normalizedName,
      normalizedCoreName: removeBrandFromIdentity(normalizedName, normalizedBrand),
      brand: product.brand,
      normalizedBrand,
      productType: product.product_type,
      variants: product.product_variants.map((variant) => ({
        variantId: variant.id,
        label: variant.label,
        concentration:
          variant.concentration ?? inferConcentration(`${product.name} ${variant.label}`),
        volumeMl: variant.volume_ml,
        variantType: variant.variant_type,
        isKit: Boolean(variant.is_kit) || /^kits?\b/i.test(product.name),
        components: [...(variant.product_variant_kit_items ?? [])]
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((component) => ({
            type: component.component_type,
            name: component.component_name,
            volumeMl: component.volume_ml,
            quantity: component.component_quantity,
          })),
      })),
    };
  });
}

function inferConcentration(value: string): "EDP" | "EDT" | "Parfum" | null {
  if (/\b(?:EDP|EAU\s+DE\s+PARFUM)\b/i.test(value)) return "EDP";
  if (/\bEDT\b/i.test(value)) return "EDT";
  if (/\bPARFUM\b/i.test(value)) return "Parfum";
  return null;
}
