"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";

import { deleteInfluencer, setInfluencerActive } from "./actions";

type Feedback = { ok: boolean; text: string } | null;

export function InfluencerRowActions({
  influencerId,
  active,
  /** Com cupom vinculado, arquivar é o caminho: a atribuição não se perde. */
  hasCoupons,
}: {
  influencerId: string;
  active: boolean;
  hasCoupons: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <Link
          href={`/admin/influenciadores/${influencerId}`}
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
              const result = await setInfluencerActive(influencerId, !active);
              setFeedback(
                result.ok
                  ? { ok: true, text: result.message }
                  : { ok: false, text: result.error },
              );
            });
          }}
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
        >
          {active ? "Arquivar" : "Reativar"}
        </button>

        {!hasCoupons && (
          <ConfirmDeleteButton
            idleLabel="Excluir"
            onConfirm={() => deleteInfluencer(influencerId)}
            onResult={(result) =>
              setFeedback(
                result.ok
                  ? {
                      ok: true,
                      text: result.message ?? "Influenciador excluído.",
                    }
                  : {
                      ok: false,
                      text: result.error ?? "Não foi possível excluir.",
                    },
              )
            }
          />
        )}
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
