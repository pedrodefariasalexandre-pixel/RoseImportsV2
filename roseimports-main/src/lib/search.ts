/**
 * Busca por texto livre nas consultas do PostgREST e nas listas locais.
 *
 * O termo digitado vai parar dentro do filtro `or=(...)`, onde vírgula,
 * parêntese, ponto e dois-pontos são separadores da sintaxe. Interpolar o
 * termo cru quebra a consulta — e deixa o filtro ser reescrito de fora
 * ("yara,active.eq.true"). (§45)
 */

/** Quantas palavras do termo entram na consulta antes de virar ruído. */
const MAX_TOKENS = 5;

/**
 * Produz a mesma forma pesquisável gravada em `products.search_text` pela
 * migração 0016: sem acentos, sem diferença entre maiúsculas/minúsculas e
 * com sinais tratados como separadores.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/º/g, "o")
    .replace(/ª/g, "a")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Envolve o valor em aspas duplas, que é como o PostgREST aceita
 * separadores dentro de um filtro. As aspas e barras invertidas do próprio
 * termo precisam ser escapadas para não fechar a string antes da hora —
 * escapamento idêntico ao do JSON.
 */
function quote(value: string): string {
  return JSON.stringify(value);
}

/**
 * Divide o termo em palavras e devolve um filtro `or` por palavra.
 *
 * Chamar `.or()` uma vez por palavra gera parâmetros separados, que o
 * PostgREST combina com AND: "Lattafa, Khamrah" acha o produto Khamrah da
 * marca Lattafa, em vez de procurar a frase inteira em um campo só.
 *
 * Devolve lista vazia quando não sobra nada pesquisável.
 */
export function searchOrFilters(
  term: string,
  columns: readonly string[] = ["search_text"],
): string[] {
  return normalizeSearchText(term)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
    .map((token) =>
      columns
        .map((column) => `${column}.ilike.${quote(`%${token}%`)}`)
        .join(","),
    );
}
