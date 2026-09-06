import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_UPDATE_PATH = "/admin/redefinir-senha";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next === PASSWORD_UPDATE_PATH ? next : PASSWORD_UPDATE_PATH;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/admin/recuperar-senha?erro=link-invalido", requestUrl.origin),
  );
}
