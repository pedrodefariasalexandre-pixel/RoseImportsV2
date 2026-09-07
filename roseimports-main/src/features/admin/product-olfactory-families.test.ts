import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0023_multiplas_familias_olfativas.sql",
  ),
  "utf8",
);

describe("famílias olfativas do produto", () => {
  it("cria a relação muitos-para-muitos e preserva os dados antigos", () => {
    expect(migration).toContain(
      "create table public.product_olfactory_families",
    );
    expect(migration).toContain(
      "primary key (product_id, olfactory_family_id)",
    );
    expect(migration).toContain(
      "select id, olfactory_family_id",
    );
  });

  it("troca todas as famílias em uma única função do banco", () => {
    expect(migration).toContain(
      "create or replace function public.set_product_olfactory_families",
    );
    expect(migration).toContain("select distinct unnest(v_family_ids)");
    expect(migration).toContain("invalid_olfactory_family");
  });
});
