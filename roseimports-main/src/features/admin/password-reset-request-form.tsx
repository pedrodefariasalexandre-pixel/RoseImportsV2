"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordResetRequestForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(() =>
    params.get("erro") === "link-invalido"
      ? "O link é inválido ou expirou. Solicite um novo link."
      : null,
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/admin/redefinir-senha`;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    if (authError) {
      setError("Não foi possível enviar o link. Tente novamente em instantes.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <p role="status" className="text-sm leading-6 text-muted">
          Se o e-mail estiver cadastrado, você receberá um link para criar uma
          nova senha. Verifique também a caixa de spam.
        </p>
        <Link
          href="/admin/login"
          className="inline-block text-xs tracking-[0.14em] text-ink uppercase underline underline-offset-4"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email-recuperacao" className="eyebrow">
          E-mail do administrador
        </label>
        <input
          id="email-recuperacao"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
        {loading ? "Enviando…" : "Enviar link de alteração"}
      </button>

      <p className="text-center">
        <Link
          href="/admin/login"
          className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
