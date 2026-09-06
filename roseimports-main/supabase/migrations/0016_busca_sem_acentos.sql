-- Forma normalizada e indexada para buscas por nome e marca de produto.
-- A função imutável permite usar unaccent em uma coluna gerada e evita
-- recalcular a expressão para cada linha durante a consulta.

create extension if not exists unaccent with schema extensions;

-- Compatível tanto com extensões instaladas em `public` nas migrações mais
-- antigas quanto com o schema `extensions` usado pelo Supabase hospedado.
set search_path = public, extensions, pg_catalog;

create or replace function public.normalize_search_text(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = public, extensions, pg_catalog
as $$
  select trim(
    regexp_replace(
      translate(lower(unaccent(value)), 'ºª', 'oa'),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

alter table public.products
  add column if not exists search_text text
  generated always as (
    public.normalize_search_text(
      coalesce(name, '') || ' ' || coalesce(brand, '')
    )
  ) stored;

create index if not exists idx_products_search_text_trgm
  on public.products using gin (search_text gin_trgm_ops);
