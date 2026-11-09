"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  code: string;
  discountPercent: number;
  /** ISO. Se já passou quando o pop-up ia abrir, ele não abre. */
  expiresAt: string | null;
};

const OPEN_DELAY_MS = 1200;

/** Chave por código: um cupom novo (BLACK10) volta a aparecer mesmo para quem fechou o BLACK5. */
function storageKey(code: string) {
  return `rose:coupon-popup:${code}`;
}

function formatEnd(iso: string): string {
  // Fim exclusivo: "expira às 00:00 do dia 19" vale até o fim do dia 18.
  const lastDay = new Date(new Date(iso).getTime() - 1);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(lastDay);
}

export function CouponPopup({ code, discountPercent, expiresAt }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  useEffect(() => {
    if (hidden) return;

    try {
      if (localStorage.getItem(storageKey(code))) return;
    } catch {
      // Sem localStorage (aba privada, por exemplo): mostra mesmo assim.
    }

    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return;

    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [code, expiresAt, hidden]);

  const close = useCallback(() => {
    setOpen(false);

    try {
      localStorage.setItem(storageKey(code), "1");
    } catch {
      // Sem localStorage, o pop-up volta na próxima visita. Aceitável.
    }
  }, [code]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Navegador sem permissão de área de transferência: o código está na
      // tela e o cliente pode selecionar e copiar na mão.
    }
  }

  if (!open || hidden) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-popup-title"
        className="relative w-full max-w-md border border-line bg-ivory px-8 py-10 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute top-3 right-4 text-2xl leading-none text-muted transition-colors hover:text-ink"
        >
          ×
        </button>

        <p className="text-xs font-medium tracking-[0.18em] text-rose uppercase">
          Oferta por tempo limitado
        </p>

        <h2
          id="coupon-popup-title"
          className="mt-4 text-2xl font-semibold text-ink"
        >
          {discountPercent}% de desconto nos perfumes
        </h2>

        <p className="mt-3 text-sm text-ink-soft">
          Copie o código e cole no carrinho para aproveitar.
        </p>

        <div className="mt-6 border border-dashed border-rose bg-rose-wash px-4 py-4">
          <span className="text-2xl font-semibold tracking-[0.2em] text-ink">
            {code}
          </span>
        </div>

        <button
          type="button"
          onClick={copyCode}
          className="mt-4 w-full bg-ink px-6 py-3.5 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90"
        >
          {copied ? "Código copiado!" : "Copiar código"}
        </button>

        {expiresAt && (
          <p className="mt-4 text-xs text-muted">
            Válido até {formatEnd(expiresAt)}
          </p>
        )}
      </div>
    </div>
  );
}
