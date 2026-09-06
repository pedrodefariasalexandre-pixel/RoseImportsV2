import { describe, expect, it } from "vitest";

import {
  mapCatalogCandidates,
  type CatalogProductRow,
} from "./catalog-candidates";

describe("mapeamento do catálogo para deduplicação", () => {
  it("normaliza os dois registros legados reais como body splash", () => {
    const rows: CatalogProductRow[] = [
      {
        id: "8e3dc712-d175-41e5-91df-97a2f346bc35",
        name: "AFEEF LA BELLE ISABELLE 250 ML",
        slug: "afeef-la-belle-isabelle-250-ml",
        brand: "Isabelle La Belle",
        product_type: "body_splash",
        product_variants: [
          {
            id: "bad3ed04-d296-4624-bbc3-428464e66009",
            label: "250",
            volume_ml: 250,
            variant_type: "full",
          },
        ],
      },
      {
        id: "f4d335f9-89fa-4c48-96dd-47cd8fcb3376",
        name: "V.V. LOVE ETHEREAL MUSE 250 ML",
        slug: "v-v-love-ethereal-muse-250-ml",
        brand: "Fragrance Mist",
        product_type: "body_splash",
        product_variants: [
          {
            id: "47f3138e-dc49-455c-86c2-3176f356d19c",
            label: "250",
            volume_ml: 250,
            variant_type: "full",
          },
        ],
      },
    ];

    expect(mapCatalogCandidates(rows)).toMatchObject([
      {
        normalizedName: "afeef la belle isabelle body splash",
        normalizedBrand: "isabelle la belle",
        productType: "body_splash",
        variants: [{ volumeMl: 250 }],
      },
      {
        normalizedName: "v v love ethereal muse body splash",
        normalizedBrand: "fragrance mist",
        productType: "body_splash",
        variants: [{ volumeMl: 250 }],
      },
    ]);
  });
});
