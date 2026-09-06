import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
};

/**
 * Quem é administrador de verdade: além de ter sessão, precisa ter perfil.
 * É a mesma regra que as policies aplicam em is_admin(), agora disponível
 * para o servidor decidir o que renderizar. (§43)
 *
 * Retorna null para visitante, para sessão sem perfil e para erro de
 * leitura — na dúvida, não é admin.
 *
 * cache() por requisição: o header do site e o layout do painel perguntam
 * a mesma coisa na mesma renderização e só uma consulta acontece.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  // Visitante não tem cookie de sessão. Sem isso, nem falamos com o
  // Supabase — é o caminho de 99% das visitas à loja. (perf)
  const cookieStore = await cookies();
  const hasSession = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!hasSession) return null;

  const supabase = await createClient();

  /*
     getClaims(), não getUser().

     getUser() é uma chamada de rede ao Auth server a cada renderização.
     Como o middleware já valida a sessão antes de qualquer tela do painel
     (matcher "/admin/:path*"), eram DUAS idas ao Supabase por navegação —
     ~220ms antes de a primeira consulta ao catálogo começar. (perf)

     getClaims() faz a mesma verificação criptográfica sem sair daqui: o
     projeto assina o JWT com chave assimétrica (ES256), e a auth-js valida
     a assinatura com a chave pública do JWKS, guardada num cache de módulo
     compartilhado entre instâncias do client e revalidado a cada 10min.
     Uma busca no JWKS por processo, não por requisição.

     Não é getSession(): aquele lê o cookie e acredita nele. Este confere a
     assinatura — token forjado ou adulterado não passa. Se um dia o projeto
     voltar para chave simétrica (HS256), a própria auth-js cai sozinha no
     getUser() de rede: fica mais lento, nunca inseguro.

     E a barreira final continua sendo o RLS: is_admin() é reavaliado no
     banco em toda query, com o token desta requisição. (§34)
  */
  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const email = typeof claims.email === "string" ? claims.email : "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: claims.sub,
    email,
    name: profile.full_name || email || "Administrador",
  };
});

/**
 * Igual ao anterior, mas corta a renderização de quem não pode estar ali.
 * Usado em cada página do painel e nas server actions — menu escondido
 * nunca é a única barreira. (§34)
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return admin;
}
