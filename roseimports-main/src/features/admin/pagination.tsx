import Link from "next/link";

/* ---------------------------------------------------------------
   Paginação do painel.

   Nasceu dentro de /admin/produtos. Estoque e Pedidos passaram a
   paginar também, e três cópias do mesmo controle divergem na
   primeira correção — então mora aqui, com o `basePath` como única
   diferença entre as telas.
   --------------------------------------------------------------- */

export type SearchParams = Record<string, string | string[] | undefined>;

/** Primeiro valor de um parâmetro repetido (`?x=1&x=2`), ou "". */
export function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Página da URL. Lixo, zero e negativo caem na primeira. */
export function pageNumber(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(first(value) || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Mesma URL, outra página: preserva busca e filtros, troca só `pagina`.
 * Página 1 não escreve o parâmetro — a URL curta é a canônica.
 */
export function pageHref(
  basePath: string,
  params: SearchParams,
  page: number,
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const selected = first(value);
    if (selected) next.set(key, selected);
  }

  next.delete("pagina");
  if (page > 1) next.set("pagina", String(page));

  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Primeira, última, atual e vizinhas. O resto vira reticência. */
function visiblePages(currentPage: number, totalPages: number) {
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1,
  );

  return pages.reduce<(number | "ellipsis")[]>((items, page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
    return items;
  }, []);
}

export function AdminPagination({
  basePath,
  currentPage,
  totalPages,
  params,
  label,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  params: SearchParams;
  /** Vai para o aria-label: "Paginação de produtos", "de pedidos"… */
  label: string;
}) {
  if (totalPages <= 1) return null;

  /*
     Cor não entra na base: bg-surface/text-ink (ociosa) e bg-ink/text-ivory
     (página atual) disputariam a mesma propriedade no mesmo elemento, e o
     Tailwind resolve pela ordem no CSS gerado, não pela ordem na classe —
     a base venceria e a página atual ficaria com texto branco sobre fundo
     claro, invisível. Mesmo ajuste já feito na paginação do catálogo.
  */
  const baseClass =
    "inline-flex h-9 min-w-9 items-center justify-center border px-3 text-xs transition-colors";
  const idleClass = "border-line bg-surface text-ink hover:border-line-strong";
  const activeClass = "border-ink bg-ink text-ivory hover:border-ink";
  const controlClass = `${baseClass} ${idleClass}`;

  return (
    <nav
      aria-label={`Paginação ${label}`}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={pageHref(basePath, params, currentPage - 1)}
          className={controlClass}
          rel="prev"
          aria-label="Página anterior"
        >
          <span aria-hidden>←</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${controlClass} cursor-not-allowed opacity-40`}
        >
          <span aria-hidden>←</span>
        </span>
      )}

      {visiblePages(currentPage, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-9 min-w-6 items-center justify-center text-xs text-muted"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(basePath, params, item)}
            aria-current={item === currentPage ? "page" : undefined}
            aria-label={`Ir para a página ${item}`}
            className={`${baseClass} ${
              item === currentPage ? activeClass : idleClass
            }`}
          >
            {item}
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={pageHref(basePath, params, currentPage + 1)}
          className={controlClass}
          rel="next"
          aria-label="Próxima página"
        >
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${controlClass} cursor-not-allowed opacity-40`}
        >
          <span aria-hidden>→</span>
        </span>
      )}
    </nav>
  );
}
