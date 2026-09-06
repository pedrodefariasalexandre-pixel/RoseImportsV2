import { describe, expect, it } from "vitest";

import {
  orderDateEndExclusive,
  orderDateStart,
  parseOrderDate,
} from "./order-date-filter";

describe("filtro de data dos pedidos", () => {
  it("aceita uma data real e recusa valores inválidos", () => {
    expect(parseOrderDate("2026-09-06")).toBe("2026-09-06");
    expect(parseOrderDate("2026-02-30")).toBe("");
    expect(parseOrderDate("06/09/2026")).toBe("");
  });

  it("usa o dia inteiro no fuso da loja", () => {
    expect(orderDateStart("2026-09-06")).toBe("2026-09-06T03:00:00.000Z");
    expect(orderDateEndExclusive("2026-09-06")).toBe(
      "2026-09-07T03:00:00.000Z",
    );
  });
});
