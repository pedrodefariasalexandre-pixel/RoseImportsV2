"use client";

import { useMemo, useState, type FormEvent } from "react";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { validateOrderNumber } from "@/features/orders/order-number";

export function OrderFollowUp({
  initialOrderNumber = "",
}: {
  initialOrderNumber?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [touched, setTouched] = useState(Boolean(initialOrderNumber));
  const validation = useMemo(
    () => validateOrderNumber(orderNumber),
    [orderNumber],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!validation.valid) return;

    window.open(
      whatsappContactUrl(
        `Olá! Gostaria de acompanhar o pedido #${validation.normalized} da Rose Imports.`,
      ),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-surface p-5 shadow-[0_18px_50px_rgba(25,20,19,0.06)] sm:p-7"
    >
      <label htmlFor="numero-pedido" className="text-sm font-semibold">
        Número do pedido
      </label>
      <p className="mt-1 text-sm leading-6 text-muted">
        Ele aparece na tela exibida depois que você finaliza o pedido.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            #
          </span>
          <input
            id="numero-pedido"
            name="numero-pedido"
            value={orderNumber}
            onChange={(event) => {
              setOrderNumber(event.target.value.slice(0, 13));
              if (touched) setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            required
            autoComplete="off"
            spellCheck={false}
            maxLength={13}
            placeholder="Ex.: RI-1048"
            aria-invalid={touched && !validation.valid}
            aria-describedby="numero-pedido-ajuda numero-pedido-erro"
            className={`h-12 w-full rounded-xl border bg-ivory pr-4 pl-8 text-sm focus:outline-none focus:ring-4 ${
              touched && !validation.valid
                ? "border-danger focus:border-danger focus:ring-danger/10"
                : "border-line focus:border-rose focus:ring-rose/10"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={!orderNumber.trim()}
          className="min-h-12 rounded-xl bg-rose px-6 text-sm font-semibold text-white transition-colors hover:bg-rose-deep disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continuar no WhatsApp
        </button>
      </div>

      <div className="mt-2 min-h-5">
        {touched && !validation.valid ? (
          <p id="numero-pedido-erro" role="alert" className="text-sm text-danger">
            {validation.error}
          </p>
        ) : validation.valid ? (
          <p id="numero-pedido-erro" className="text-sm text-success">
            Formato válido: #{validation.normalized}
          </p>
        ) : null}
      </div>

      <p id="numero-pedido-ajuda" className="mt-2 text-xs leading-5 text-muted">
        O formato do código é conferido antes de abrir a mensagem. Por
        segurança, nenhuma informação do pedido é exibida publicamente nesta
        página.
      </p>
    </form>
  );
}
