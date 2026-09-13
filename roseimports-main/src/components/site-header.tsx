"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { CartLink } from "@/components/cart-link";
import { AdminLink } from "@/components/admin-link";
import { FavoritesCount } from "@/components/favorites-count";
import { HeaderSearch } from "@/components/header-search";
import { whatsappContactUrl } from "@/lib/whatsapp";

const CATEGORY_NAV = [
  { href: "/catalogo?categoria=perfumes", label: "Perfumes" },
  { href: "/catalogo?categoria=body-splash", label: "Body Splash" },
  { href: "/catalogo?categoria=body-cream", label: "Body Cream" },
  { href: "/catalogo?categoria=cosmeticos", label: "Cosméticos" },
] as const;

const ABOUT_NAV = { href: "/sobre-nos", label: "Sobre nós" } as const;

const NAV = [
  { href: "/catalogo?q=Victoria%27s+Secret", label: "Victoria’s Secret" },
  { href: "/catalogo?genero=masculino", label: "Masculino" },
  { href: "/catalogo?genero=feminino", label: "Feminino" },
  { href: "/catalogo", label: "Todos" },
  { href: "/acompanhar-pedido", label: "Acompanhar pedido" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 text-ivory backdrop-blur-md">
      <div className="border-b border-white/10 bg-black">
        <p className="mx-auto max-w-7xl px-3 py-2 text-center text-[0.58rem] font-medium uppercase tracking-[0.1em] text-rose-soft sm:px-6 sm:py-2.5 sm:text-xs sm:tracking-[0.16em] lg:px-8">
          Rose Imports · perfumes e cuidados corporais
        </p>
      </div>

      <div className="bg-black">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8 lg:py-4 xl:gap-5">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((value) => !value);
            }}
            className="
              -ml-1 flex h-10 w-10 shrink-0 items-center justify-center
              rounded-lg transition-all duration-200
              hover:bg-white/10 hover:text-rose-soft active:scale-95
              xl:hidden
            "
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
          >
            <span className="sr-only">
              {menuOpen ? "Fechar menu" : "Abrir menu"}
            </span>

            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>

          <Logo
            variant="header"
            className="shrink-0"
          />

          <HeaderSearch
            id="busca-header-desktop"
            className="mx-auto hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-xl"
          />

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <AdminLink
              className="
                hidden text-xs font-medium text-ivory/70
                transition-colors duration-200 hover:text-rose-soft 2xl:inline
              "
            />

            <Link
              href="/favoritos"
              aria-label="Favoritos"
              className="
                group flex h-10 items-center justify-center gap-2 rounded-lg px-2.5
                text-sm font-medium transition-all duration-200
                hover:bg-white/10 hover:text-rose-soft active:scale-[0.97]
                sm:px-3
              "
            >
              <span className="relative">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover:scale-110"
                  aria-hidden
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>

                <FavoritesCount />
              </span>

              <span className="hidden 2xl:inline">Favoritos</span>
            </Link>

            <CartLink />

            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="
                hidden min-h-10 shrink-0 items-center justify-center
                rounded-full bg-rose px-3 text-xs font-semibold text-white
                transition-colors duration-200 hover:bg-rose-deep
                xl:inline-flex xl:min-h-11 xl:px-5
              "
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="px-4 pb-2.5 sm:px-6 md:hidden">
          <HeaderSearch id="busca-header-mobile" />
        </div>
      </div>

      <nav
        className="hidden border-t border-white/10 bg-black xl:block"
        aria-label="Principal"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-8 py-3.5 2xl:gap-8">
          <Link
            href={ABOUT_NAV.href}
            className="whitespace-nowrap text-[0.8rem] font-semibold tracking-[0.01em] text-rose-soft transition-colors duration-200 hover:text-white 2xl:text-sm 2xl:tracking-[0.02em]"
          >
            {ABOUT_NAV.label}
          </Link>

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] font-semibold tracking-[0.01em] text-rose-soft transition-colors duration-200 group-hover:text-white group-focus-within:text-white 2xl:text-sm 2xl:tracking-[0.02em]"
              aria-haspopup="menu"
            >
              Categorias
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#120f0e] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                {CATEGORY_NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-ivory/85 transition-colors hover:bg-white/10 hover:text-rose-soft focus:bg-white/10 focus:text-rose-soft"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="whitespace-nowrap text-[0.8rem] font-semibold tracking-[0.01em] text-rose-soft transition-colors duration-200 hover:text-white 2xl:text-sm 2xl:tracking-[0.02em]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {menuOpen && (
        <nav
          id="menu-principal"
          className="border-t border-white/10 bg-black xl:hidden"
          aria-label="Principal"
        >
          <ul className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <li className="border-b border-white/10">
              <a
                href={whatsappContactUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-3.5 text-sm font-semibold text-rose-soft transition-colors hover:text-white"
              >
                Falar no WhatsApp
              </a>
            </li>

            <li className="border-b border-white/10">
              <Link
                href={ABOUT_NAV.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3.5 text-sm font-medium text-ivory/85 transition-colors hover:text-rose-soft"
              >
                {ABOUT_NAV.label}
              </Link>
            </li>

            <li className="border-b border-white/10">
              <button
                type="button"
                onClick={() => setCategoriesOpen((value) => !value)}
                className="flex w-full items-center justify-between py-3.5 text-left text-sm font-medium text-ivory/85 transition-colors hover:text-rose-soft"
                aria-expanded={categoriesOpen}
                aria-controls="categorias-mobile"
              >
                Categorias
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${categoriesOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {categoriesOpen && (
                <ul id="categorias-mobile" className="mb-3 rounded-xl bg-white/[0.04] px-3 py-1">
                  {CATEGORY_NAV.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          setMenuOpen(false);
                          setCategoriesOpen(false);
                        }}
                        className="block py-2.5 text-sm text-rose-soft transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {NAV.map((item) => (
              <li key={item.label} className="border-b border-white/10">
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3.5 text-sm font-medium text-ivory/85 transition-colors hover:text-rose-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}

            <li className="border-b border-white/10">
              <Link
                href="/favoritos"
                className="flex items-center gap-3 py-3.5 text-sm font-medium text-ivory/85 transition-colors hover:text-rose-soft"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>
                Favoritos
              </Link>
            </li>

            <li>
              <AdminLink className="block py-3.5 text-sm font-medium text-rose-soft" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
