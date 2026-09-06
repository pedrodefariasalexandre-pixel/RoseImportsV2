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

/** Cabeçalho exclusivo do painel e versão reduzida para autenticação. */
export function AdminNav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const authenticated = Boolean(userName);

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Logo
            variant="mark"
            href={authenticated ? "/admin" : "/"}
            className="shrink-0"
            imageClassName="!h-9"
          />

          <span className="hidden h-7 w-px bg-line sm:block" aria-hidden />

          <Link
            href={authenticated ? "/admin" : "/admin/login"}
            className="flex min-w-0 items-baseline gap-1 truncate text-sm font-semibold text-ink"
          >
            <span className="sm:hidden">Painel</span>
            <span className="hidden sm:inline">Painel administrativo</span>
            {userName && (
              <>
                <span className="text-muted" aria-hidden>
                  /
                </span>
                <span className="truncate text-muted">{userName}</span>
              </>
            )}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 w-20 items-center justify-center rounded-md border border-line bg-surface px-2 text-[0.68rem] font-semibold tracking-[0.06em] text-muted uppercase transition-colors hover:border-rose-soft hover:text-rose sm:w-24 sm:text-xs"
          >
            Ver loja
          </Link>

          {authenticated && (
            <form action={signOut} className="flex">
              <button
                type="submit"
                className="inline-flex h-9 w-20 items-center justify-center rounded-md border border-line bg-surface px-2 text-[0.68rem] font-semibold tracking-[0.06em] text-muted uppercase transition-colors hover:border-danger/35 hover:bg-danger/5 hover:text-danger sm:w-24 sm:text-xs"
              >
                Sair
              </button>
            </form>
          )}
        </div>
      </div>

      {authenticated && (
        <>
          <div className="border-t border-line/80">
            <div className="mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-4 px-5">
              <span className="eyebrow whitespace-nowrap">Administração</span>

              <nav className="hidden gap-4 lg:flex xl:gap-6" aria-label="Painel">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`border-b-2 py-3 text-xs tracking-[0.1em] uppercase transition-colors ${
                      isActive(item.href)
                        ? "border-rose text-rose"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-ivory lg:hidden"
                aria-expanded={open}
                aria-controls="menu-painel"
              >
                <span className="sr-only">
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
              className="border-t border-line bg-surface lg:hidden"
              aria-label="Painel"
            >
              <ul className="mx-auto max-w-6xl px-5 pb-2">
                {NAV.map((item) => (
                  <li key={item.href} className="border-b border-line last:border-0">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={`block py-3 text-sm ${
                        isActive(item.href) ? "font-semibold text-rose" : "text-ink"
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
