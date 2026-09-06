import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/keys";
import type { Database } from "@/types/database";

function supabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "Configure SUPABASE_SECRET_KEY (sb_secret_...) no .env.local",
    );
  }

  return key;
}

/**
 * Client com service role: IGNORA RLS.
 *
 * Uso restrito à criação do pré-pedido em /api/pedidos, onde o preço e a
 * disponibilidade são recalculados a partir do banco. O import de
 * "server-only" faz o build quebrar se este arquivo for parar no bundle
 * do navegador. (§34, §70)
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
