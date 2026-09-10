"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { signOut } from "@/features/admin/actions";

const NAV = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/vitrine", label: "Ordem do catálogo" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/influenciadores", label: "Influenciadores" },
];

const headerActionClass =
  "inline-flex h-10 min-w-[5.5rem] items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-soft hover:text-rose hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose sm:min-w-[6.25rem]";

/** Cabeçalho exclusivo do painel e versão reduzida para autenticação. */
export function AdminNav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const authenticated = Boolean(userName);

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-[#f7f4f1]/95 shadow-[0_1px_12px_rgba(25,20,19,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Logo
            variant="mark"
            href={authenticated ? "/admin" : "/"}
            className="shrink-0"
            imageClassName="!h-9"
          />

          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />

          <Link
            href={authenticated ? "/admin" : "/admin/login"}
            className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink"
          >
            <span className="sm:hidden">Painel</span>
            <span className="hidden sm:inline">Painel administrativo</span>
            {userName && (
              <>
                <span className="text-muted" aria-hidden>
                  /
                </span>
                <span className="truncate font-medium text-rose">{userName}</span>
              </>
            )}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className={headerActionClass}
          >
            Ver loja
          </Link>

          {authenticated && (
            <form action={signOut} className="flex">
              <button
                type="submit"
                className={headerActionClass}
              >
                Sair
              </button>
            </form>
          )}
        </div>
      </div>

      {authenticated && (
        <>
          <div className="border-t border-line/70 bg-white/70">
            <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <span className="hidden whitespace-nowrap text-xs font-semibold text-ink-soft md:inline lg:hidden">
                Administração
              </span>

              <nav className="hidden w-full items-center gap-1.5 lg:flex" aria-label="Painel">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all xl:px-4 ${
                      isActive(item.href)
                        ? "bg-rose text-white shadow-sm"
                        : "text-muted hover:bg-rose-wash hover:text-rose-deep"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink shadow-sm transition-colors hover:border-rose-soft hover:text-rose lg:hidden"
                aria-expanded={open}
                aria-controls="menu-painel"
              >
                <span>
                  {open ? "Fechar menu do painel" : "Abrir menu do painel"}
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  {open ? (
                    <path d="M6 6l12 12M18 6L6 18" />
                  ) : (
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {open && (
            <nav
              id="menu-painel"
              className="border-t border-line bg-white px-4 pb-4 sm:px-6 lg:hidden"
              aria-label="Painel"
            >
              <ul className="mx-auto grid max-w-7xl gap-1 pt-3 sm:grid-cols-2">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={`block rounded-xl px-4 py-3 text-sm transition-colors ${
                        isActive(item.href)
                          ? "bg-rose text-white"
                          : "text-ink hover:bg-rose-wash hover:text-rose"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </>
      )}
    </header>
  );
}
