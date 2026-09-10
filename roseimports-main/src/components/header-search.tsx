"use client";

import Link from "next/link";
import { useState } from "react";

const QUICK_LINKS = [
  ["Perfumes", "/catalogo?categoria=perfumes"],
  ["Body Cream", "/catalogo?categoria=body-cream"],
  ["Feminino", "/catalogo?genero=feminino"],
  ["Masculino", "/catalogo?genero=masculino"],
] as const;

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function HeaderSearch({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <form action="/catalogo" className="relative z-20">
        <label htmlFor={id} className="sr-only">
          Buscar perfumes e produtos
        </label>
        <input
          id={id}
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Qual perfume você procura?"
          className="h-11 w-full rounded-full border border-line-strong bg-surface py-2.5 pl-5 pr-12 text-sm text-ink shadow-sm placeholder:text-muted transition-all hover:border-rose/60 focus:border-rose focus:outline-none focus:ring-4 focus:ring-rose/10"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-ivory transition-colors hover:bg-rose"
          aria-label="Pesquisar"
        >
          <SearchIcon />
        </button>
      </form>

      {focused && (
        <div className="absolute inset-x-0 top-[calc(100%-0.25rem)] z-10 rounded-b-2xl border border-line bg-surface px-4 pb-4 pt-6 shadow-[0_18px_45px_rgba(25,20,19,0.12)]">
          <p className="text-xs font-semibold text-ink-soft">
            Buscas rápidas
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full bg-ivory-deep px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-rose-wash hover:text-rose"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
