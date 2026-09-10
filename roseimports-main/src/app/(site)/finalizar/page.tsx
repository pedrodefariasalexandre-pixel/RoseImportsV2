import type { Metadata } from "next";
import { CheckoutForm } from "@/features/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Finalizar pedido",
  robots: { index: false },
};

export default function FinalizarPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-rose">Fechamento acompanhado</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Finalize com segurança</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">
          Precisamos de poucos dados. O resto — taxa de entrega, horário e
          pagamento — combinamos no WhatsApp.
        </p>
      </header>

      <ol className="mt-8 grid overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-3">
        {[
          ["1", "Carrinho", "Produtos revisados"],
          ["2", "Seus dados", "Etapa atual"],
          ["3", "WhatsApp", "Confirmação com a loja"],
        ].map(([number, title, description], index) => (
          <li
            key={number}
            className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${
              index > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                index <= 1 ? "bg-rose text-white" : "bg-ivory-deep text-muted"
              }`}
            >
              {number}
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-muted">{description}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-ink px-5 py-4 text-ivory">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose text-sm font-bold">
          ✓
        </span>
        <p className="text-sm leading-6 text-ivory/70">
          O site registra seu pedido, mas não faz cobrança automática. A Rose
          confirma disponibilidade, entrega e pagamento diretamente com você.
        </p>
      </div>

      <div className="mt-8">
        <CheckoutForm />
      </div>
    </div>
  );
}
