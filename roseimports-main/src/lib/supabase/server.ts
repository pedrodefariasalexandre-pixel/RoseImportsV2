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
