"use client";

import { usePathname } from "next/navigation";

/**
 * O painel tem cabeçalho próprio. Evita misturar navegação de compra com
 * tarefas administrativas e mantém login e recuperação de acesso focados.
 */
export function HeaderSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return <>{children}</>;
}
