/**
 * Chaves de API do Supabase.
 *
 * O Supabase substituiu as chaves legacy (`anon` e `service_role`, ambas
 * JWT começando com `eyJ`) por um par novo:
 *
 * - `sb_publishable_...` — pública, entra no bundle do navegador,
 *   equivale à antiga `anon`;
 * - `sb_secret_...` — só servidor, ignora RLS, equivale à antiga
 *   `service_role`.
 *
 * Quando as legacy são desativadas no painel, toda query passa a
 * responder "Legacy API keys are disabled".
 *
 * Aceitamos os dois nomes de variável: a nova ganha, a antiga fica como
 * fallback para não quebrar quem ainda tem o `.env.local` velho. As
 * referências a `process.env.NEXT_PUBLIC_*` precisam ser literais — o
 * Next troca o texto no bundle, então não dá para montar o nome da
 * variável dinamicamente.
 */

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada");
  return url;
}

/** Chave pública (browser, RLS ativo). */
export function supabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...) no .env.local",
    );
  }

  return key;
}
