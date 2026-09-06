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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <Link
          href={`/admin/produtos/${productId}`}
          className="text-xs tracking-[0.1em] text-rose uppercase hover:underline"
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
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
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
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
        >
          {active ? "Desativar" : "Ativar"}
        </button>

        <ConfirmDeleteButton
          idleLabel="Excluir"
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
          className={`max-w-xs text-right text-xs ${
            feedback.ok ? "text-success" : "text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
