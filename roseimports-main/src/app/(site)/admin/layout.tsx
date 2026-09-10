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
    <div className="min-h-screen bg-[#f7f4f1]">
      <AdminNav userName={admin?.name ?? null} />
      {admin ? (
        <main className="admin-shell mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      ) : (
        <main className="admin-shell">{children}</main>
      )}
    </div>
  );
}
