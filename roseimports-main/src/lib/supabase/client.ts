"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/keys";
import type { Database } from "@/types/database";

/** Client do navegador. Só chave pública, só leitura de catálogo. */
export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
  );
}
