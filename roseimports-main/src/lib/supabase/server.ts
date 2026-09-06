import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/keys";
import type { Database } from "@/types/database";

/**
 * Client de servidor com a sessão do usuário. Respeita RLS.
 * Use em Server Components e Server Actions do admin.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component não pode escrever cookie.
            // O middleware já renova a sessão, então isso é seguro ignorar.
          }
        },
      },
    },
  );
}

/**
 * Client de servidor SEM sessão: chave pública, papel `anon`, RLS ativo.
 *
 * Existe por uma restrição do Next: dentro de `unstable_cache` não se pode
 * ler `cookies()` — o valor cacheado é compartilhado entre requisições, e o
 * framework barra qualquer coisa que dependa de quem está pedindo.
 *
 * Serve só para leitura de dado público e igual para todo mundo (categorias,
 * famílias olfativas). Nada de painel passa por aqui: sem cookie, `is_admin()`
 * é falso e as policies só liberam o catálogo ativo. (§34)
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
