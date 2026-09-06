import { describe, expect, it } from "vitest";
import { shouldShowProductDisplaySettings } from "@/features/admin/product-display-settings";
import type { Product } from "@/types/database";

describe("shouldShowProductDisplaySettings", () => {
  it("esconde os controles durante a criação", () => {
    expect(shouldShowProductDisplaySettings(null)).toBe(false);
  });

  it("mostra os controles durante a edição", () => {
    expect(
      shouldShowProductDisplaySettings({ id: "produto-1" } as Product),
    ).toBe(true);
  });
});
