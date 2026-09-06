import type { Metadata } from "next";
import { AdminNav } from "@/features/admin/admin-nav";
import { getAdminUser } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Rose Imports" },
  robots: { index: false, follow: false },
};

/**
 * O painel vive dentro do site: header, rodapé e tipografia vêm do layout
 * público. Aqui só entram a subnavegação e a checagem de permissão.
 *
 * Sem perfil de administrador, nada do painel é renderizado — nem a nav.
 * As páginas públicas de autenticação compartilham este layout e aparecem
 * sem navegação quando ainda não há uma sessão de administrador.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) return <>{children}</>;

  return (
    <>
      <AdminNav userName={admin.name} />
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </>
  );
}
