"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteProduct,
  toggleProductActive,
  toggleProductFlag,
} from "@/features/admin/actions";
import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";

type Feedback = { ok: boolean; text: string } | null;

export function ProductRowActions({
  productId,
  active,
  featured,
}: {
  productId: string;
  active: boolean;
  featured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const secondaryActionClass =
    "inline-flex min-h-11 min-w-0 w-full items-center justify-center whitespace-normal rounded-md border border-line bg-surface px-2.5 py-2 text-center text-[0.6875rem] font-medium leading-[1.2] tracking-[0.05em] text-muted uppercase transition-colors hover:border-rose/40 hover:text-ink disabled:opacity-50";

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {!deleteArmed && (
          <>
            <Link
              href={`/admin/produtos/${productId}`}
              className="inline-flex min-h-11 min-w-0 w-full items-center justify-center whitespace-normal rounded-md bg-rose px-2.5 py-2 text-center text-[0.6875rem] font-medium leading-[1.2] tracking-[0.05em] text-white uppercase transition-opacity hover:opacity-90"
            >
              Editar
            </Link>

            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFeedback(null);
                startTransition(async () => {
                  const result = await toggleProductFlag(
                    productId,
                    "featured",
                    !featured,
                  );
                  setFeedback(
                    result.ok
                      ? { ok: true, text: result.message }
                      : { ok: false, text: result.error },
                  );
                });
              }}
              className={secondaryActionClass}
            >
              {featured ? "Tirar destaque" : "Destacar"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFeedback(null);
                startTransition(async () => {
                  const result = await toggleProductActive(productId, !active);
                  setFeedback(
                    result.ok
                      ? { ok: true, text: result.message }
                      : { ok: false, text: result.error },
                  );
                });
              }}
              className={secondaryActionClass}
            >
              {active ? "Desativar" : "Ativar"}
            </button>
          </>
        )}

        <ConfirmDeleteButton
          idleLabel="Excluir"
          confirmLabel="Sim, excluir"
          prompt="Excluir este produto?"
          presentation="panel"
          className="inline-flex min-h-11 min-w-0 w-full items-center justify-center whitespace-normal rounded-md border border-danger/25 bg-danger/5 px-2.5 py-2 text-center text-[0.6875rem] font-medium leading-[1.2] tracking-[0.05em] text-danger uppercase transition-colors hover:border-danger/50 hover:bg-danger/10"
          onArmedChange={setDeleteArmed}
          onConfirm={() => deleteProduct(productId)}
          onResult={(result) =>
            setFeedback(
              result.ok
                ? { ok: true, text: result.message ?? "Produto excluído." }
                : {
                    ok: false,
                    text: result.error ?? "Não foi possível excluir.",
                  },
            )
          }
        />
      </div>

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`text-left text-xs ${
            feedback.ok ? "text-success" : "text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
