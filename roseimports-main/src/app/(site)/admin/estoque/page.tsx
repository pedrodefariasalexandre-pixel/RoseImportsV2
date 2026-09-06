import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { StockRow } from "@/features/admin/stock-row";
import { getCatalogCounts } from "@/features/admin/metrics";
import {
  AdminPagination,
  first,
  pageHref,
  pageNumber,
  type SearchParams,
} from "@/features/admin/pagination";

export const metadata: Metadata = { title: "Estoque" };
export const dynamic = "force-dynamic";

type Filtro = "todos" | "criticos" | "sem-estoque";

const BASE_PATH = "/admin/estoque";

/*
   Antes esta tela não tinha teto: trazia TODA variante do catálogo com o
   produto e TODAS as imagens aninhadas, e então filtrava, buscava, ordenava
   e recortava em memória. Com 92 variantes passava despercebido; com dois
   mil, é payload de megabytes a cada F5.

   Agora quem faz o trabalho é admin_stock_rows() (migration 0017): filtra,
   busca por nome do produto OU rótulo da versão — sem acento, via
   normalize_search_text() da migration 0016_busca_sem_acentos —, ordena,
   devolve a capa já escolhida e o total do conjunto. Uma ida ao banco,
   uma página de cada vez. (perf)
*/
const PAGE_SIZE = 50;

function parseFiltro(value: string): Filtro {
  return value === "criticos" || value === "sem-estoque" ? value : "todos";
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser();

  const params = await searchParams;

  const filtro = parseFiltro(first(params.filtro));
  const busca = first(params.busca);
  const currentPage = pageNumber(params.pagina);

  const supabase = await createClient();

  // Resumo e listagem não dependem um do outro: saem juntos.
  const [counts, listagem] = await Promise.all([
    getCatalogCounts(),

    supabase.rpc("admin_stock_rows", {
      p_filtro: filtro,
      p_busca: busca,
      p_limit: PAGE_SIZE,
      p_offset: (currentPage - 1) * PAGE_SIZE,
    }),
  ]);

  if (listagem.error) {
    throw new Error(listagem.error.message);
  }

  const rows = listagem.data ?? [];

  /*
     total_count vem repetido em toda linha (é `count(*) over ()`), então a
     primeira serve. Sem linha nenhuma, não há total a ler — e aí ou o filtro
     não casou com nada, ou a página pedida passou do fim.
  */
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Página além do fim (URL editada na mão, ou item removido desde o último
  // carregamento) volta para a primeira, em vez de mostrar uma tela vazia.
  if (rows.length === 0 && currentPage > 1) {
    redirect(pageHref(BASE_PATH, params, 1));
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}

      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            Operação
          </p>

          <h1 className="mt-1 text-2xl">
            Estoque
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Consulte e altere rapidamente preço e
            quantidade dos produtos.
          </p>
        </div>

        {/* AÇÕES DO CABEÇALHO */}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildExportUrl(
              filtro,
              busca,
            )}
            className="
              inline-flex items-center justify-center
              bg-ink px-4 py-2.5
              text-xs font-medium
              tracking-[0.08em]
              text-ivory uppercase
              transition
              hover:opacity-90
            "
          >
            Exportar Excel
          </Link>

          <Link
            href="/admin/produtos"
            className="
              inline-flex items-center justify-center
              border border-line-strong
              bg-surface px-4 py-2.5
              text-xs font-medium
              tracking-[0.08em] uppercase
              transition
              hover:border-ink
            "
          >
            Ver produtos
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
          md:grid-cols-5
        "
        aria-label="Resumo do estoque"
      >
        <SummaryItem
          label="Produtos ativos"
          value={counts.produtosAtivos}
        />

        <SummaryItem
          label="Versões ativas"
          value={counts.variantesAtivas}
        />

        <SummaryItem
          label="Unidades"
          value={counts.unidadesTotal}
        />

        <SummaryItem
          label="Acabando"
          value={counts.variantesCriticas}
          href="/admin/estoque?filtro=criticos"
        />

        <SummaryItem
          label="Sem estoque"
          value={counts.variantesSemEstoque}
          href="/admin/estoque?filtro=sem-estoque"
        />
      </section>

      {/* BUSCA + FILTROS */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          action="/admin/estoque"
          method="get"
          className="flex w-full max-w-xl gap-2"
        >
          {filtro !== "todos" && (
            <input
              type="hidden"
              name="filtro"
              value={filtro}
            />
          )}

          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar produto ou versão..."
            className="
              h-11 flex-1
              border border-line
              bg-surface
              px-3
              text-sm
              outline-none
              transition
              placeholder:text-muted
              focus:border-line-strong
            "
          />

          <button
            type="submit"
            className="
              h-11
              bg-ink
              px-5
              text-xs font-medium
              tracking-[0.08em]
              text-ivory uppercase
              transition-opacity
              hover:opacity-90
            "
          >
            Buscar
          </button>

          {busca && (
            <Link
              href={
                filtro !== "todos"
                  ? `/admin/estoque?filtro=${filtro}`
                  : "/admin/estoque"
              }
              className="
                flex h-11 items-center
                px-2
                text-xs text-muted
                hover:text-ink
              "
            >
              Limpar
            </Link>
          )}
        </form>

        {/* FILTROS */}

        <nav
          className="
            flex w-fit gap-1
            border border-line
            bg-surface
            p-1
          "
          aria-label="Filtrar estoque"
        >
          <FilterLink
            href={buildFilterUrl(
              "todos",
              busca,
            )}
            active={
              filtro === "todos"
            }
          >
            Todos
          </FilterLink>

          <FilterLink
            href={buildFilterUrl(
              "criticos",
              busca,
            )}
            active={
              filtro === "criticos"
            }
          >
            Acabando

            {counts.variantesCriticas > 0 && (
              <span className="ml-1 opacity-70">
                ({counts.variantesCriticas})
              </span>
            )}
          </FilterLink>

          <FilterLink
            href={buildFilterUrl(
              "sem-estoque",
              busca,
            )}
            active={
              filtro ===
              "sem-estoque"
            }
          >
            Sem estoque

            {counts.variantesSemEstoque > 0 && (
              <span className="ml-1 opacity-70">
                ({counts.variantesSemEstoque})
              </span>
            )}
          </FilterLink>
        </nav>
      </div>

      {/* RESULTADO DA BUSCA */}

      {busca && (
        <p className="text-xs text-muted">
          {total === 1
            ? "1 resultado encontrado"
            : `${total} resultados encontrados`}{" "}
          para{" "}
          <span className="font-medium text-ink">
            “{busca}”
          </span>
        </p>
      )}

      {/* TABELA */}

      {rows.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>
                    Produto
                  </Th>

                  <Th>
                    Preço
                  </Th>

                  <Th>
                    Quantidade
                  </Th>

                  <Th>
                    Status
                  </Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <StockRow
                    key={row.id}
                    variantId={row.id}
                    productName={row.product_name}
                    productImagePath={
                      row.cover_storage_path
                    }
                    variantLabel={row.label}
                    stockQuantity={
                      row.stock_quantity
                    }
                    priceCents={row.price_cents}
                    active={
                      row.active &&
                      row.product_active
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ESTADO VAZIO */

        <div className="border border-line bg-surface px-5 py-14 text-center">
          <p className="text-sm font-medium text-ink">
            {busca
              ? "Nenhum produto encontrado"
              : filtro ===
                  "criticos"
                ? "Nenhum produto está acabando"
                : filtro ===
                    "sem-estoque"
                  ? "Nenhum produto está sem estoque"
                  : "Nenhum produto cadastrado"}
          </p>

          <p className="mt-1 text-xs text-muted">
            {busca
              ? "Tente pesquisar por outro nome ou versão."
              : "Os produtos cadastrados aparecerão aqui."}
          </p>

          {busca && (
            <Link
              href="/admin/estoque"
              className="
                mt-4 inline-block
                text-xs font-medium
                text-rose
                hover:underline
              "
            >
              Limpar pesquisa
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
        label="do estoque"
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   RESUMO
---------------------------------------------------------------- */

function SummaryItem({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="bg-surface px-4 py-4 transition hover:bg-ivory/50">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-xl font-medium text-ink">
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
}

/* ---------------------------------------------------------------
   FILTRO
---------------------------------------------------------------- */

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className={`
        px-3.5 py-2
        text-xs
        transition-colors
        ${
          active
            ? "bg-ink text-ivory"
            : "text-muted hover:bg-ivory hover:text-ink"
        }
      `}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------
   CABEÇALHO DA TABELA
---------------------------------------------------------------- */

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      className="
        px-4 py-3
        text-xs font-normal
        tracking-[0.08em]
        text-muted uppercase
      "
    >
      {children}
    </th>
  );
}

/* ---------------------------------------------------------------
   URL DOS FILTROS

   Trocar de filtro ou de busca zera a paginação de propósito: a
   página 7 do filtro anterior quase nunca existe no próximo.
---------------------------------------------------------------- */

function buildFilterUrl(
  filtro: Filtro,
  busca: string,
) {
  const params =
    new URLSearchParams();

  if (filtro !== "todos") {
    params.set(
      "filtro",
      filtro,
    );
  }

  if (busca.trim()) {
    params.set(
      "busca",
      busca.trim(),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/estoque?${query}`
    : "/admin/estoque";
}

/* ---------------------------------------------------------------
   URL DE EXPORTAÇÃO

   A exportação continua trazendo o conjunto inteiro, sem página: é
   uma planilha, e planilha pela metade não serve para nada.
---------------------------------------------------------------- */

function buildExportUrl(
  filtro: Filtro,
  busca: string,
) {
  const params =
    new URLSearchParams();

  if (filtro !== "todos") {
    params.set(
      "filtro",
      filtro,
    );
  }

  if (busca.trim()) {
    params.set(
      "busca",
      busca.trim(),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/estoque/exportar?${query}`
    : "/admin/estoque/exportar";
}
