import Link from "next/link";

const BASE_PATH = "/admin/pedidos";

export function OrderListFilters({
  query,
  startDate,
  endDate,
  status,
}: {
  query: string;
  startDate: string;
  endDate: string;
  status: string;
}) {
  const clearParams = new URLSearchParams();
  if (status) clearParams.set("status", status);
  const clearHref = clearParams.size
    ? `${BASE_PATH}?${clearParams}`
    : BASE_PATH;

  return (
    <form
      action={BASE_PATH}
      method="get"
      className="border border-line bg-surface p-4 sm:p-5"
    >
      {status ? <input type="hidden" name="status" value={status} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto] lg:items-end">
        <div>
          <label htmlFor="pedido-busca" className="eyebrow">
            Buscar
          </label>
          <input
            id="pedido-busca"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Número, cliente, bairro ou cupom..."
            className="mt-2 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-rose focus:ring-1 focus:ring-rose/10"
          />
        </div>

        <div>
          <label htmlFor="pedido-data-inicio" className="eyebrow">
            De
          </label>
          <input
            id="pedido-data-inicio"
            name="data_inicio"
            type="date"
            defaultValue={startDate}
            className="mt-2 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose/10"
          />
        </div>

        <div>
          <label htmlFor="pedido-data-fim" className="eyebrow">
            Até
          </label>
          <input
            id="pedido-data-fim"
            name="data_fim"
            type="date"
            defaultValue={endDate}
            className="mt-2 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose/10"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="h-10 bg-ink px-5 text-xs font-medium tracking-[0.08em] text-ivory uppercase transition-opacity hover:opacity-90"
          >
            Filtrar
          </button>

          {query || startDate || endDate ? (
            <Link
              href={clearHref}
              className="text-xs tracking-[0.08em] text-rose uppercase underline-offset-4 hover:underline"
            >
              Limpar
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
