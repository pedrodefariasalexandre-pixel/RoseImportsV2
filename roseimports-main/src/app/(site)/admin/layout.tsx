import type { Metadata } from "next";
import { AdminNav } from "@/features/admin/admin-nav";
import { getAdminUser } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Rose Imports" },
  robots: { index: false, follow: false },
};

/** O admin usa uma estrutura própria, sem navegação de compra. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  return (
    <>
      <AdminNav userName={admin?.name ?? null} />
      {admin ? (
        <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
      ) : (
        children
      )}
    </>
  );
}
