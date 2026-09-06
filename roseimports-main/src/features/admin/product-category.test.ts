import { describe, expect, it } from "vitest";

import { categorySlugForProductType } from "@/lib/product-category";

describe("categoria comercial do produto", () => {
  it("usa uma categoria própria para body cream", () => {
    expect(categorySlugForProductType("body_cream")).toBe("body-cream");
  });

  it("mantém cosmético como um quarto tipo independente", () => {
    expect(categorySlugForProductType("cosmetico")).toBe("cosmeticos");
  });

  it("separa perfumes e body splash em categorias próprias", () => {
    expect(categorySlugForProductType("perfume")).toBe("perfumes");
    expect(categorySlugForProductType("body_splash")).toBe("body-splash");
  });
});
