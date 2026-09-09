"use client";

import { useTransition, useState } from "react";

export type DeleteResult = { ok: boolean; error?: string; message?: string };

/**
 * Exclusão em duas etapas: o primeiro clique "arma" a ação e mostra
 * "Confirmar exclusão" + "Cancelar". Só o segundo clique executa.
 * Substitui o window.confirm por uma confirmação visível no próprio lugar.
 */
export function ConfirmDeleteButton({
  onConfirm,
  idleLabel = "Excluir",
  confirmLabel = "Confirmar exclusão",
  cancelLabel = "Cancelar",
  prompt = "Excluir este item?",
  presentation = "inline",
  className = "",
  onResult,
  onArmedChange,
}: {
  onConfirm: () => Promise<DeleteResult>;
  idleLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  prompt?: string;
  presentation?: "inline" | "panel";
  className?: string;
  onResult?: (result: DeleteResult) => void;
  onArmedChange?: (armed: boolean) => void;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => {
          setArmed(true);
          onArmedChange?.(true);
        }}
        className={`text-xs tracking-[0.1em] text-muted uppercase hover:text-danger ${className}`}
      >
        {idleLabel}
      </button>
    );
  }

  const finish = () => {
    setArmed(false);
    onArmedChange?.(false);
  };

  if (presentation === "panel") {
    return (
      <span className="col-span-2 grid w-full min-w-0 grid-cols-2 gap-2 rounded-md border border-danger/25 bg-danger/5 p-2.5">
        <span className="col-span-2 text-left text-xs font-medium text-ink">
          {prompt}
        </span>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await onConfirm();
              onResult?.(result);
              finish();
            })
          }
          className="min-h-11 min-w-0 whitespace-normal rounded-md bg-danger px-2 py-2 text-center text-[0.6875rem] font-medium leading-[1.2] tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Excluindo…" : confirmLabel}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={finish}
          className="min-h-11 min-w-0 whitespace-normal rounded-md border border-line bg-surface px-2 py-2 text-center text-[0.6875rem] font-medium leading-[1.2] tracking-[0.04em] text-muted uppercase hover:text-ink disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await onConfirm();
            onResult?.(result);
            // Em caso de sucesso a linha some via revalidate; se continuar
            // montado (erro), desarma para não travar em modo confirmação.
            finish();
          })
        }
        className="text-xs tracking-[0.1em] text-danger uppercase hover:underline disabled:opacity-50"
      >
        {pending ? "Excluindo…" : confirmLabel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={finish}
        className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
      >
        {cancelLabel}
      </button>
    </span>
  );
}
