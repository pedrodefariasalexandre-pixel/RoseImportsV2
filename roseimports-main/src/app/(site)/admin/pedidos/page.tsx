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
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/labels";
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

/** Mesma URL, outro status: trocar de filtro sempre volta à página 1. */
function filterHref(status: string): string {
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

  const status = parseStatus(first(params.status));
  const currentPage = pageNumber(params.pagina);
  const from = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      // subtotal_cents saiu: a tabela mostra o total já com desconto.
      "id, order_number, customer_name, fulfillment_type, neighborhood, payment_method, discount_cents, total_cents, coupon_code_snapshot, status, created_at",
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);

  // Resumo e listagem não dependem um do outro: saem na mesma onda.
  const [resumo, listagem] = await Promise.all([
    supabase.rpc("admin_order_status_counts").single(),
    query,
  ]);

  const error = resumo.error ?? listagem.error;
  const counts = resumo.data;
  const orders = listagem.data ?? [];

  /*
     O total da paginação sai do resumo, não de um `count: exact` na
     listagem: a função já conta por status, e pedir a mesma conta duas
     vezes na mesma renderização custava ~80ms sem devolver nada novo.
  */
  const total = counts ? (status ? counts[status] : counts.total) : orders.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /*
     Página além do fim — URL editada na mão, ou filtro que encolheu desde
     o último carregamento. A listagem já voltou vazia; o que falta é a URL
     apontar para uma página que existe, em vez de exibir "nenhum pedido"
     numa loja cheia deles.
  */
  if (currentPage > totalPages) {
    redirect(pageHref(BASE_PATH, params, totalPages));
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
            className="inline-flex w-fit items-center justify-center border border-line px-5 py-3 text-xs font-medium tracking-[0.1em] text-ink uppercase transition-colors hover:bg-white"
          >
            Ver estoque
          </Link>
        </div>
      </header>

      {/* RESUMO */}

      {counts && (
        <section
          className="
            grid grid-cols-2 gap-px
            overflow-hidden
            border border-line
            bg-line
            md:grid-cols-5
          "
          aria-label="Resumo dos pedidos"
        >
          <SummaryItem
            label="Pedidos"
            value={counts.total}
            href={filterHref("")}
          />

          <SummaryItem
            label="Novos"
            value={counts.novo}
            href={filterHref("novo")}
          />

          <SummaryItem
            label="Em atendimento"
            value={counts.em_atendimento}
            href={filterHref("em_atendimento")}
          />

          <SummaryItem
            label="Pagos"
            value={counts.pago}
            href={filterHref("pago")}
          />

          <SummaryItem
            label="Cancelados"
            value={counts.cancelado}
            href={filterHref("cancelado")}
          />
        </section>
      )}

      {/* FILTROS */}

      <nav className="flex flex-wrap gap-1.5" aria-label="Filtrar por status">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.label}
              href={filterHref(filter.value)}
              aria-current={active ? "page" : undefined}
              className={`border px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition-colors ${
                active
                  ? "border-ink bg-ink text-ivory"
                  : "border-line bg-surface text-muted hover:border-line-strong"
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

      {/* RESULTADO */}

      {!error && status && (
        <p className="text-xs text-muted">
          {total === 1 ? "1 pedido" : `${total} pedidos`} com status{" "}
          <span className="font-medium text-ink">
            {ORDER_STATUS_LABEL[status]}
          </span>
        </p>
      )}

      {/* TABELA */}

      {orders.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
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
                    className="transition-colors hover:bg-ivory/40"
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

          <div className="border border-line bg-surface px-5 py-14 text-center">
            <p className="text-sm font-medium text-ink">
              {status
                ? "Nenhum pedido com esse status"
                : "Nenhum pedido ainda"}
            </p>

            <p className="mt-1 text-xs text-muted">
              {status
                ? `Nada em "${ORDER_STATUS_LABEL[status]}" no momento.`
                : "Os pré-pedidos gerados pelo site aparecem aqui."}
            </p>

            {status && (
              <Link
                href={BASE_PATH}
                className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
              >
                Ver todos os pedidos
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
