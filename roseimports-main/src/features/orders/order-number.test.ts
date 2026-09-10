import { describe, expect, it } from "vitest";
import {
  normalizeOrderNumber,
  validateOrderNumber,
} from "@/features/orders/order-number";

describe("order number", () => {
  it.each([
    ["1048", "RI-1048"],
    ["ri-1048", "RI-1048"],
    ["RI 1048", "RI-1048"],
    ["#RI-1048", "RI-1048"],
  ])("normaliza %s", (input, expected) => {
    expect(normalizeOrderNumber(input)).toBe(expected);
  });

  it.each(["nome", "RI-10", "999", "1048abc", "RI-10-48"])(
    "recusa %s",
    (input) => {
      expect(validateOrderNumber(input).valid).toBe(false);
    },
  );

  it.each(["1048", "RI-1048", "ri 12035"])("aceita %s", (input) => {
    expect(validateOrderNumber(input).valid).toBe(true);
  });
});
