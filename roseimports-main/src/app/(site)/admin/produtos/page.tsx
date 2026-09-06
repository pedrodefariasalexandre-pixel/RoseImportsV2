import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  getCatalogCounts,
  getProductBrands,
} from "@/features/admin/metrics";
import { ProductRowActions } from "@/features/admin/product-row-actions";
import { AdminProductFilters } from "@/features/admin/product-filters";
import {
  AdminPagination,
  first,
  pageHref,
  pageNumber,
  type SearchParams,
} from "@/features/admin/pagination";
import {
  ADMIN_PAGE_SIZES,
  ADMIN_PAGE_SIZE_ALL,
  ADMIN_PAGE_SIZE_DEFAULT,
} from "@/features/admin/product-filters.constants";
import { getCategories } from "@/features/catalog/queries";
import { ProductImage } from "@/components/product-image";
import { searchOrFilters } from "@/lib/search";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

type ProductImageRow = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

const PRODUCT_SELECT = `
  id,
  name,
  brand,
  active,
  featured,
  promotional,
  gender,
  categories (
    name
  ),
  product_variants (
    id,
    stock_quantity,
    active
  ),
  product_images (
    storage_path,
    alt_text,
    sort_order
  )
`;

/** `null` = "Todos", opção que só existe no painel. */
function parsePageSize(value: string): number | null {
  if (value === ADMIN_PAGE_SIZE_ALL) return null;

  const parsed = Number.parseInt(value, 10);
  return (ADMIN_PAGE_SIZES as readonly number[]).includes(parsed)
    ? parsed
    : ADMIN_PAGE_SIZE_DEFAULT;
}

const BASE_PATH = "/admin/produtos";

type Row = {
  id: string;
  name: string;
  brand: string | null;
  active: boolean;
  featured: boolean;
  promotional: boolean;

  categories: {
    name: string;
  } | null;

  product_variants: {
    id: string;
    stock_quantity: number;
    active: boolean;
  }[];

  product_images: ProductImageRow[];
};

/** Produto ativo, com versões ativas, cujo estoque somado zerou. */
function isSemEstoque(product: Row): boolean {
  const activeVariants = product.product_variants.filter(
    (variant) => variant.active,
  );

  if (!product.active || activeVariants.length === 0) return false;

  return (
    activeVariants.reduce(
      (sum, variant) => sum + variant.stock_quantity,
      0,
    ) <= 0
  );
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser();

  const params = await searchParams;

  const q = first(params.q);
  const categoria = first(params.categoria);
  const marca = first(params.marca);
  const genero = first(params.genero);
  const situacao = first(params.situacao);
  const destaque = first(params.destaque);
  const estoque = first(params.estoque);

  const pageSize = parsePageSize(
    first(params.por_pagina) || String(ADMIN_PAGE_SIZE_DEFAULT),
  );
  const currentPage = pageNumber(params.pagina);

  const supabase = await createClient();

  /*
     Categorias servem ao seletor e à tradução slug → id do filtro.

     É a única consulta que precisa vir antes das outras — o `categoryId`
     entra no `where` de todas elas. Por isso ela é cacheada na origem
     (queries.ts): sai da rede e para de segurar a fila. (perf)
  */
  const categories = await getCategories();
  const categoryId =
    categories.find((category) => category.slug === categoria)?.id ?? null;
  const categoriaInvalida = Boolean(categoria) && categoryId === null;

  const applyFilters = <
    T extends {
      or: (filters: string) => T;
      eq: (column: string, value: string | boolean) => T;
    },
  >(
    builder: T,
  ): T => {
    let next = builder;

    // Termo escapado e quebrado em palavras: vírgula, parêntese e ponto são
    // sintaxe do PostgREST e quebrariam a consulta se fossem interpolados.
    for (const filter of searchOrFilters(q)) {
      next = next.or(filter);
    }

    if (categoryId) next = next.eq("category_id", categoryId);
    if (marca) next = next.eq("brand", marca);
    if (
      genero === "feminino" ||
      genero === "masculino" ||
      genero === "unissex"
    ) {
      next = next.eq("gender", genero);
    }
    if (situacao === "ativo") next = next.eq("active", true);
    if (situacao === "inativo") next = next.eq("active", false);
    if (destaque === "sim") next = next.eq("featured", true);
    if (destaque === "nao") next = next.eq("featured", false);

    return next;
  };

  /*
     "Sem estoque" é agregado de product_variants, que o PostgREST não
     filtra nem conta. Só nesse caso a página traz o conjunto filtrado
     inteiro e recorta aqui; os demais filtros paginam no banco.
  */
  const filtraEstoque = estoque === "sem";

  /*
     PRIMEIRA ONDA.

     Marcas, resumo do catálogo e a contagem do filtro corrente não dependem
     umas das outras. Rodavam em série — quatro round-trips de ~120ms
     empilhados antes de a listagem sequer começar. Agora saem juntos.

     A contagem precisa vir antes das LINHAS, e só delas: `.range()` fora do
     total faz o PostgREST responder 416, então a página é corrigida antes de
     virar intervalo, não depois da consulta falhar. (perf)
  */
  const [brands, counts, countResult, semEstoqueResult] = await Promise.all([
    getProductBrands(),

    // Mesma fonte da tela de Estoque: os dois painéis não podem discordar.
    // Vale o catálogo inteiro, não os filtros correntes — é um resumo da loja.
    getCatalogCounts(),

    !categoriaInvalida && !filtraEstoque
      ? applyFilters(
          supabase.from("products").select("id", { count: "exact", head: true }),
        )
      : null,

    filtraEstoque && !categoriaInvalida
      ? applyFilters(
          supabase.from("products").select(PRODUCT_SELECT).order("name"),
        )
      : null,
  ]);

  if (countResult?.error) throw new Error(countResult.error.message);
  if (semEstoqueResult?.error) throw new Error(semEstoqueResult.error.message);

  let rows: Row[] = [];
  let total = countResult?.count ?? 0;

  if (semEstoqueResult) {
    rows = ((semEstoqueResult.data ?? []) as unknown as Row[]).filter(
      isSemEstoque,
    );
    total = rows.length;
  }

  const totalPages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  // Trocar filtro ou quantidade não pode deixar o painel numa página vazia.
  if (currentPage > totalPages) {
    redirect(pageHref(BASE_PATH, params, totalPages));
  }

  const from = pageSize ? (currentPage - 1) * pageSize : 0;

  // SEGUNDA ONDA: as linhas da página, agora que o total é conhecido.
  if (!filtraEstoque && !categoriaInvalida && total > 0) {
    let query = applyFilters(
      supabase.from("products").select(PRODUCT_SELECT).order("name"),
    );

    if (pageSize) {
      query = query.range(from, from + pageSize - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    rows = (data ?? []) as unknown as Row[];
  }

  const products =
    filtraEstoque && pageSize ? rows.slice(from, from + pageSize) : rows;

  const hasFilters = Boolean(
    q || categoria || marca || genero || situacao || destaque || estoque,
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}

      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            Catálogo
          </p>

          <h1 className="mt-1 text-2xl">
            Produtos
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Gerencie os produtos, preços, estoque,
            imagens e disponibilidade no catálogo.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/produtos/cadastro-em-lote"
            className="inline-flex w-fit items-center justify-center border border-line px-5 py-3 text-xs font-medium tracking-[0.1em] text-ink uppercase transition-colors hover:bg-white"
          >
            Cadastro em lote
          </Link>
          <Link
            href="/admin/produtos/novo"
            className="inline-flex w-fit items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90"
          >
            + Novo produto
          </Link>
        </div>
      </header>

      {/* RESUMO */}

      <section
        className="
          grid grid-cols-2 gap-px
          overflow-hidden
          border border-line
          bg-line
          lg:grid-cols-4
        "
      >
        <SummaryItem
          label="Produtos cadastrados"
          value={counts.produtosTotal}
        />

        <SummaryItem
          label="Produtos ativos"
          value={counts.produtosAtivos}
        />

        <SummaryItem
          label="Produtos inativos"
          value={counts.produtosTotal - counts.produtosAtivos}
        />

        <SummaryItem
          label="Ativos sem estoque"
          value={counts.ativosSemEstoque}
        />
      </section>

      {/* BUSCA E FILTROS */}

      <Suspense fallback={<div className="h-28" />}>
        <AdminProductFilters
          categories={categories.map((category) => ({
            value: category.slug,
            label: category.name,
          }))}
          brands={brands}
        />
      </Suspense>

      {/* RESULTADO */}

      {hasFilters && (
        <p className="text-xs text-muted">
          {total === 1
            ? "1 produto encontrado"
            : `${total} produtos encontrados`}
          {q && (
            <>
              {" "}
              para{" "}
              <span className="font-medium text-ink">
                “{q}”
              </span>
            </>
          )}
        </p>
      )}


      {/* TABELA */}

      {products.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Produto</Th>
                  <Th>Categoria</Th>
                  <Th>Estoque</Th>
                  <Th>Situação</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {products.map(
                  (product) => {
                    const variants =
                      product.product_variants;

                    const activeVariants =
                      variants.filter(
                        (variant) =>
                          variant.active,
                      );

                    const totalStock =
                      activeVariants.reduce(
                        (sum, variant) =>
                          sum +
                          variant.stock_quantity,
                        0,
                      );

                    const images = [
                      ...(product.product_images ??
                        []),
                    ].sort(
                      (a, b) =>
                        a.sort_order -
                        b.sort_order,
                    );

                    const cover =
                      images[0] ?? null;

                    return (
                      <tr
                        key={product.id}
                        className={`
                          transition-colors
                          hover:bg-ivory/40
                          ${
                            product.active
                              ? ""
                              : "opacity-55"
                          }
                        `}
                      >
                        {/* PRODUTO */}

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-ivory">
                              <ProductImage
                                path={
                                  cover?.storage_path ??
                                  null
                                }
                                alt={
                                  cover?.alt_text ??
                                  product.name
                                }
                                sizes="48px"
                              />
                            </div>

                            <div className="min-w-0">
                              <Link
                                href={`/admin/produtos/${product.id}`}
                                className="
                                  block max-w-[18rem]
                                  truncate
                                  font-medium
                                  text-ink
                                  transition-colors
                                  hover:text-rose
                                "
                              >
                                {product.name}
                              </Link>

                              {product.brand && (
                                <span className="mt-0.5 block text-xs text-muted">
                                  {
                                    product.brand
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CATEGORIA */}

                        <td className="px-4 py-3 text-muted">
                          {product.categories
                            ?.name ?? "—"}
                        </td>

                        {/* ESTOQUE */}

                        <td className="px-4 py-3">
                          {variants.length ===
                          0 ? (
                            <span className="text-xs text-danger">
                              Sem versões
                            </span>
                          ) : (
                            <div>
                              <p className="text-sm text-ink">
                                {totalStock} un.
                              </p>

                              <p className="mt-0.5 text-xs text-muted">
                                {
                                  activeVariants.length
                                }{" "}
                                {activeVariants.length ===
                                1
                                  ? "versão"
                                  : "versões"}
                              </p>
                            </div>
                          )}
                        </td>

                        {/* SITUAÇÃO */}

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {product.active ? (
                              <Tag tone="success">
                                Ativo
                              </Tag>
                            ) : (
                              <Tag tone="muted">
                                Inativo
                              </Tag>
                            )}

                            {product.featured && (
                              <Tag tone="rose">
                                Destaque
                              </Tag>
                            )}

                            {product.promotional && (
                              <Tag tone="gold">
                                Promoção
                              </Tag>
                            )}

                            {product.active &&
                              variants.length >
                                0 &&
                              totalStock <= 0 && (
                                <Tag tone="danger">
                                  Sem estoque
                                </Tag>
                              )}
                          </div>
                        </td>

                        {/* AÇÕES */}

                        <td className="px-4 py-3">
                          <ProductRowActions
                            productId={
                              product.id
                            }
                            active={
                              product.active
                            }
                            featured={
                              product.featured
                            }
                          />
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-line bg-surface px-5 py-14 text-center">
          <p className="text-sm font-medium text-ink">
            {hasFilters
              ? "Nenhum produto encontrado"
              : "Nenhum produto cadastrado"}
          </p>

          <p className="mt-1 text-xs text-muted">
            {hasFilters
              ? "Ajuste a busca ou os filtros para ver mais produtos."
              : "Comece cadastrando o primeiro produto da loja."}
          </p>

          {hasFilters ? (
            <Link
              href="/admin/produtos"
              className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
            >
              Limpar filtros
            </Link>
          ) : (
            <Link
              href="/admin/produtos/novo"
              className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
            >
              Cadastrar produto
            </Link>
          )}
        </div>
      )}

      {/* PAGINAÇÃO */}

      <AdminPagination
        basePath={BASE_PATH}
        currentPage={currentPage}
        totalPages={totalPages}
        params={params}
        label="de produtos"
      />
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface px-4 py-4">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-xl font-medium text-ink">
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.08em] text-muted uppercase">
      {children}
    </th>
  );
}

function Tag({
  tone,
  children,
}: {
  tone:
    | "muted"
    | "rose"
    | "gold"
    | "success"
    | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    muted:
      "bg-ivory-deep text-muted",

    rose:
      "bg-rose-wash text-rose",

    gold:
      "bg-gold-soft/30 text-gold",

    success:
      "bg-success/10 text-success",

    danger:
      "bg-danger/10 text-danger",
  } as const;

  return (
    <span
      className={`
        px-2 py-0.5
        text-[0.625rem]
        tracking-[0.08em]
        uppercase
        ${styles[tone]}
      `}
    >
      {children}
    </span>
  );
}
