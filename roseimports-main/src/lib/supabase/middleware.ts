import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/keys";

/**
 * Renova a sessão a cada request e barra /admin sem login.
 * A verificação real de permissão acontece de novo no layout do admin
 * e nas policies — o middleware é a primeira camada, não a única.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  /*
     getClaims() renova a sessão igual ao getUser() — por dentro ele passa
     pelo getSession(), que troca o refresh token e devolve os cookies novos
     pelo setAll() acima. A diferença é onde a assinatura é conferida:
     getUser() pergunta ao Auth server (round-trip por requisição), getClaims()
     valida localmente com a chave pública do projeto (ES256), buscada uma vez
     por processo e revalidada a cada 10min.

     Token expirado, forjado ou de outro projeto continua sendo recusado — só
     não custa mais uma viagem de rede para descobrir isso. (perf)
  */
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";
  const isPublicAuthPage =
    isLoginPage || path === "/admin/recuperar-senha";

  if (isAdminArea && !isPublicAuthPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
