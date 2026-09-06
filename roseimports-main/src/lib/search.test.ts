import { describe, expect, it } from "vitest";
import { normalizeSearchText, searchOrFilters } from "@/lib/search";

describe("normalizeSearchText", () => {
  it.each([
    ["CAFÉ CITADEL EAU DE PARFUM 100ML", "cafe citadel eau de parfum 100ml"],
    ["Fougère", "fougere"],
    ["Nº 5", "no 5"],
  ])("normaliza %s", (value, expected) => {
    expect(normalizeSearchText(value)).toBe(expected);
  });

  it("permite encontrar o nome usando a grafia sem acento", () => {
    const productName = normalizeSearchText(
      "CAFÉ CITADEL EAU DE PARFUM 100ML",
    );

    expect(productName).toContain(normalizeSearchText("cafe"));
  });
});

describe("searchOrFilters", () => {
  it("consulta a coluna normalizada", () => {
    expect(searchOrFilters("café Fougère")).toEqual([
      'search_text.ilike."%cafe%"',
      'search_text.ilike."%fougere%"',
    ]);
  });

  it("descarta a sintaxe do PostgREST presente no termo", () => {
    expect(searchOrFilters("cafe,active.eq.true")).toEqual([
      'search_text.ilike."%cafe%"',
      'search_text.ilike."%active%"',
      'search_text.ilike."%eq%"',
      'search_text.ilike."%true%"',
    ]);
  });
});
