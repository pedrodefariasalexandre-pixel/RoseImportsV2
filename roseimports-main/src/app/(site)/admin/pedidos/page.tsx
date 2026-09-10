import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { StatusPill } from "@/components/status-pill";
import {
  AdminPagination,
  first,
  pageHref,
  pageNumber,
  type SearchParams,
} from "@/features/admin/pagination";
import {
  orderDateEndExclusive,
  orderDateStart,
  parseOrderDate,
} from "@/features/admin/order-date-filter";
import { OrderListFilters } from "@/features/admin/order-list-filters";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/labels";
import { searchOrFilters } from "@/lib/search";
import type { FulfillmentType, OrderStatus, PaymentMethod } from "@/types/database";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const BASE_PATH = "/admin/pedidos";

/*
   A tela trazia `.limit(100)` fixo e nenhuma paginação: do pedido 101 em
   diante o painel simplesmente não mostrava, sem aviso nenhum. Não era
   lentidão, era número errado na tela de quem opera a loja.
*/
const PAGE_SIZE = 50;

const STATUSES = [
  "novo",
  "em_atendimento",
  "pago",
  "entregue",
  "retirado",
  "cancelado",
] as const;

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "pago", label: "Pagos" },
  { value: "entregue", label: "Entregues" },
  { value: "retirado", label: "Retirados" },
  { value: "cancelado", label: "Cancelados" },
];

function parseStatus(value: string): OrderStatus | "" {
  return (STATUSES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : "";
}

/** Preserva busca e período ao trocar a situação, sempre voltando à página 1. */
function filterHref(params: SearchParams, status: string): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const selected = first(value);
    if (selected) next.set(key, selected);
  }

  next.delete("pagina");
  if (status) next.set("status", status);
  else next.delete("status");

  const query = next.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

/** Os cartões são totais globais; seus links também limpam os demais filtros. */
function summaryHref(status: string): string {
  return status ? `${BASE_PATH}?status=${status}` : BASE_PATH;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const params = await searchParams;

  const q = first(params.q).trim();
  const status = parseStatus(first(params.status));
  const startDate = parseOrderDate(first(params.data_inicio));
  const endDate = parseOrderDate(first(params.data_fim));
  const invalidDateRange = Boolean(
    startDate && endDate && startDate > endDate,
  );
  const currentPage = pageNumber(params.pagina);
  const from = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const applyFilters = <
    T extends {
      or: (filters: string) => T;
      eq: (column: string, value: string) => T;
      gte: (column: string, value: string) => T;
      lt: (column: string, value: string) => T;
    },
  >(
    builder: T,
  ): T => {
    let next = builder;

    for (const filter of searchOrFilters(q)) next = next.or(filter);
    if (status) next = next.eq("status", status);
    if (startDate) next = next.gte("created_at", orderDateStart(startDate));
    if (endDate) {
      next = next.lt("created_at", orderDateEndExclusive(endDate));
    }

    return next;
  };

  const countQuery = applyFilters(
    supabase.from("orders").select("id", { count: "exact", head: true }),
  );
  const listQuery = applyFilters(
    supabase
      .from("orders")
      .select(
        // subtotal_cents saiu: a tabela mostra o total já com desconto.
        "id, order_number, customer_name, fulfillment_type, neighborhood, payment_method, discount_cents, total_cents, coupon_code_snapshot, status, created_at",
      ),
  )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // Resumo, total filtrado e linhas não dependem um do outro.
  const [resumo, contagem, listagem] = await Promise.all([
    supabase.rpc("admin_order_status_counts").single(),
    countQuery,
    listQuery,
  ]);

  const countError = resumo.error ?? contagem.error;
  const counts = resumo.data;
  const total = contagem.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!countError && currentPage > totalPages) {
    redirect(pageHref(BASE_PATH, params, totalPages));
  }

  const error = countError ?? listagem.error;
  const orders = listagem.data ?? [];
  const hasFilters = Boolean(q || status || startDate || endDate);
  const firstVisible = total > 0 ? from + 1 : 0;
  const lastVisible = total > 0 ? Math.min(from + orders.length, total) : 0;

  return (
    <div className="space-y-7">
      {/* CABEÇALHO */}

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-rose">
            Operação
          </p>

          <h1 className="mt-1 text-3xl sm:text-4xl">
            Pedidos
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Acompanhe os pré-pedidos gerados pelo site,
            confirme pagamentos e registre a entrega.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/estoque"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-soft hover:text-rose hover:shadow-md"
          >
            Ver estoque
            <span aria-hidden>→</span>
          </Link>
        </div>
      </header>

      {/* RESUMO */}

      {counts && (
        <section
          className="
            grid grid-cols-2 gap-3
            md:grid-cols-5
          "
          aria-label="Resumo dos pedidos"
        >
          <SummaryItem
            label="Pedidos"
            value={counts.total}
            href={summaryHref("")}
          />

          <SummaryItem
            label="Novos"
            value={counts.novo}
            href={summaryHref("novo")}
          />

          <SummaryItem
            label="Em atendimento"
            value={counts.em_atendimento}
            href={summaryHref("em_atendimento")}
          />

          <SummaryItem
            label="Pagos"
            value={counts.pago}
            href={summaryHref("pago")}
          />

          <SummaryItem
            label="Cancelados"
            value={counts.cancelado}
            href={summaryHref("cancelado")}
          />
        </section>
      )}

      {/* FILTROS */}

      <OrderListFilters
        query={q}
        startDate={startDate}
        endDate={endDate}
        status={status}
      />

      <nav
        className="flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm"
        aria-label="Filtrar por status"
      >
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.label}
              href={filterHref(params, filter.value)}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-rose text-white shadow-sm"
                  : "text-muted hover:bg-rose-wash hover:text-rose-deep"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {error && (
        <p role="alert" className="text-sm text-danger">
          Não foi possível carregar os pedidos. Recarregue a página.
        </p>
      )}

      {invalidDateRange && !error && (
        <p role="alert" className="text-sm text-danger">
          A data inicial precisa ser anterior ou igual à data final.
        </p>
      )}

      {/* RESULTADO */}

      {!error && (
        <p className="text-sm text-muted" aria-live="polite">
          Exibindo {firstVisible}–{lastVisible} de {total}{" "}
          {total === 1 ? "pedido" : "pedidos"}
          {hasFilters ? " para os filtros selecionados" : " no total"}.
        </p>
      )}

      {/* TABELA */}

      {orders.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_8px_30px_rgba(25,20,19,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-ivory-deep/40 text-left">
                  <Th>Pedido</Th>
                  <Th>Data</Th>
                  <Th>Cliente</Th>
                  <Th>Recebimento</Th>
                  <Th>Pagamento</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-rose-wash/35"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="font-medium text-ink transition-colors hover:text-rose"
                      >
                        #{order.order_number}
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(order.created_at)}
                    </td>

                    <td className="px-4 py-3">{order.customer_name}</td>

                    <td className="px-4 py-3">
                      {FULFILLMENT_LABEL[order.fulfillment_type as FulfillmentType]}
                      {order.neighborhood && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {order.neighborhood}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {PAYMENT_LABEL[order.payment_method as PaymentMethod]}
                    </td>

                    <td className="px-4 py-3">
                      {formatCents(order.total_cents)}

                      {order.coupon_code_snapshot && (
                        <span className="mt-0.5 block text-xs text-rose">
                          {order.coupon_code_snapshot} −
                          {formatCents(order.discount_cents)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill status={order.status as OrderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !error && (
          /* ESTADO VAZIO */

          <div className="rounded-2xl border border-line bg-surface px-5 py-14 text-center shadow-sm">
            <p className="text-sm font-medium text-ink">
              {hasFilters ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
            </p>

            <p className="mt-1 text-xs text-muted">
              {hasFilters
                ? "Ajuste ou limpe a busca, o período e a situação."
                : "Os pré-pedidos gerados pelo site aparecem aqui."}
            </p>

            {hasFilters && (
              <Link
                href={BASE_PATH}
                className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
              >
                Limpar todos os filtros
              </Link>
            )}
          </div>
        )
      )}

      {/* PAGINAÇÃO */}

      <AdminPagination
        basePath={BASE_PATH}
        currentPage={currentPage}
        totalPages={totalPages}
        params={params}
        label="de pedidos"
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
    <div className="group h-full rounded-2xl border border-line bg-white px-4 py-4 shadow-[0_6px_20px_rgba(25,20,19,0.04)] transition-all hover:-translate-y-0.5 hover:border-rose-soft hover:shadow-md">
      <p className="text-xs font-semibold text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-ink transition-colors group-hover:text-rose-deep">
        {value}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

/* ---------------------------------------------------------------
   CABEÇALHO DA TABELA
---------------------------------------------------------------- */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.08em] text-muted uppercase">
      {children}
    </th>
  );
}
