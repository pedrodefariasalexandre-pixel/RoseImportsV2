import type { Metadata } from "next";
import { OrderFollowUp } from "@/features/orders/order-follow-up";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  description: "Fale com a Rose Imports para acompanhar seu pedido.",
  robots: { index: false },
};

const STEPS = [
  ["Pedido recebido", "A loja recebe os itens e os dados informados."],
  ["Confirmação no WhatsApp", "Disponibilidade, entrega e pagamento são combinados."],
  ["Preparação e entrega", "A Rose informa os próximos passos diretamente a você."],
] as const;

type SearchParams = Promise<{ pedido?: string | string[] }>;

export default async function AcompanharPedidoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialOrderNumber = Array.isArray(params.pedido)
    ? params.pedido[0]
    : params.pedido;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-rose">Atendimento próximo</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Acompanhe seu pedido</h1>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
          Como o fechamento acontece pelo WhatsApp, a equipe da Rose confirma
          cada atualização diretamente com você.
        </p>
      </header>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <ol className="space-y-3">
          {STEPS.map(([title, description], index) => (
            <li
              key={title}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-ivory">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <OrderFollowUp initialOrderNumber={initialOrderNumber} />
      </div>
    </main>
  );
}
