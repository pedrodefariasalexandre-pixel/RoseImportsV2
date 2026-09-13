import { describe, expect, it } from "vitest";

import { createOrderSchema } from "./schemas";

const basePedido = {
  customerName: "Duda",
  fulfillmentType: "retirada" as const,
  paymentMethod: "pix" as const,
  items: [
    {
      variantId: "20000000-0000-4000-8000-000000000001",
      quantity: 2,
    },
  ],
};

describe("createOrderSchema", () => {
  it("descarta qualquer valor de desconto enviado pelo navegador", () => {
    const parsed = createOrderSchema.parse({
      ...basePedido,
      couponCode: "DUDA10",
      // Um cliente malicioso mandando o desconto pronto:
      discountCents: 999_999,
      totalCents: 1,
      subtotalCents: 1,
      couponDiscountPercent: 90,
    });

    // Só o código sobrevive. Quem calcula o valor é o banco.
    expect(parsed).not.toHaveProperty("discountCents");
    expect(parsed).not.toHaveProperty("totalCents");
    expect(parsed).not.toHaveProperty("subtotalCents");
    expect(parsed).not.toHaveProperty("couponDiscountPercent");
    expect(parsed.couponCode).toBe("DUDA10");
  });

  it("aceita pedido sem cupom", () => {
    const parsed = createOrderSchema.parse(basePedido);

    expect(parsed.couponCode).toBeUndefined();
  });

  it("também descarta preço enviado junto do item", () => {
    const parsed = createOrderSchema.parse({
      ...basePedido,
      items: [
        {
          variantId: "20000000-0000-4000-8000-000000000001",
          quantity: 2,
          priceCents: 1,
        },
      ],
    });

    expect(parsed.items[0]).not.toHaveProperty("priceCents");
  });

  it("recusa código de cupom longo demais", () => {
    const result = createOrderSchema.safeParse({
      ...basePedido,
      couponCode: "A".repeat(25),
    });

    expect(result.success).toBe(false);
  });

  it("recusa nome sem letras suficientes", () => {
    for (const customerName of ["11", "@@", "A."]) {
      const result = createOrderSchema.safeParse({
        ...basePedido,
        customerName,
      });

      expect(result.success).toBe(false);
    }
  });

  it("aceita nomes reais com acento, apóstrofo e hífen", () => {
    for (const customerName of ["João da Silva", "D'Ávila", "Maria-Luiza"]) {
      const result = createOrderSchema.safeParse({
        ...basePedido,
        customerName,
      });

      expect(result.success).toBe(true);
    }
  });

  it("recusa endereço de entrega com textos falsos e UF inexistente", () => {
    const result = createOrderSchema.safeParse({
      ...basePedido,
      customerName: "Ana Souza",
      fulfillmentType: "entrega",
      cep: "88850-000",
      street: "11",
      number: "12@@",
      complement: "@@",
      neighborhood: "@@",
      city: "11",
      state: "99",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([
        "street",
        "number",
        "complement",
        "neighborhood",
        "city",
        "state",
      ]),
    );
  });

  it("aceita endereço brasileiro válido com UF em minúsculas", () => {
    const result = createOrderSchema.safeParse({
      ...basePedido,
      customerName: "José D'Ávila",
      fulfillmentType: "entrega",
      cep: "88850-000",
      street: "Rua 25 de Março",
      number: "125-A",
      neighborhood: "Santa Cruz",
      city: "Forquilhinha",
      state: "sc",
    });

    expect(result.success).toBe(true);
  });
});
