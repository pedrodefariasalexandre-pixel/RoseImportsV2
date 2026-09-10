const ITEMS = [
  {
    title: "Curadoria de importados",
    text: "Produtos selecionados e informações claras.",
    icon: "sparkles",
  },
  {
    title: "Atendimento no WhatsApp",
    text: "Dúvidas e fechamento direto com a loja.",
    icon: "message",
  },
  {
    title: "Entrega ou retirada",
    text: "Prazo e horário combinados no atendimento.",
    icon: "bag",
  },
  {
    title: "Pagamento combinado",
    text: "Pix, dinheiro ou cartão conforme atendimento.",
    icon: "card",
  },
] as const;

function TrustIcon({ name }: { name: (typeof ITEMS)[number]["icon"] }) {
  if (name === "message") {
    return <path d="M5 17.5 3.5 21l4-1.4A8.5 8.5 0 1 0 5 17.5Z" />;
  }

  if (name === "bag") {
    return (
      <>
        <path d="M5 8h14l-1 13H6L5 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </>
    );
  }

  if (name === "card") {
    return (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    );
  }

  return (
    <>
      <path d="m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z" />
      <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
    </>
  );
}

export function TrustStrip() {
  return (
    <section className="border-y border-white/10 bg-ink text-ivory">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex min-h-28 gap-3 bg-ink px-4 py-5 sm:min-h-32 sm:px-5 lg:items-center lg:px-7"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose text-white">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <TrustIcon name={item.icon} />
              </svg>
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5 text-ivory">
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-ivory/60">
                {item.text}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
