"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordUpdateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(
        "Não foi possível alterar a senha. Verifique os requisitos ou solicite um novo link.",
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <p role="status" className="text-sm leading-6 text-muted">
          Senha alterada com sucesso. Você já pode continuar para o painel.
        </p>
        <Link
          href="/admin"
          className="inline-block bg-ink px-6 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85"
        >
          Ir para o painel
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="nova-senha" className="eyebrow">
          Nova senha
        </label>
        <input
          id="nova-senha"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full border border-line bg-ivory px-4 py-3 text-sm focus:border-rose focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="confirmar-senha" className="eyebrow">
          Confirmar nova senha
        </label>
        <input
          id="confirmar-senha"
          type="password"
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-2 w-full border border-line bg-ivory px-4 py-3 text-sm focus:border-rose focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink px-6 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {loading ? "Alterando…" : "Alterar senha"}
      </button>
    </form>
  );
}
