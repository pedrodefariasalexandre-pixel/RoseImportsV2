-- Busca operacional de pedidos sem diferença entre acentos e caixa.
-- A coluna gerada reaproveita a normalização criada na migração 0016.

set search_path = public, extensions, pg_catalog;

alter table public.orders
  add column if not exists search_text text
  generated always as (
    public.normalize_search_text(
      coalesce(order_number, '') || ' ' ||
      coalesce(customer_name, '') || ' ' ||
      coalesce(neighborhood, '') || ' ' ||
      coalesce(coupon_code_snapshot, '')
    )
  ) stored;

create index if not exists idx_orders_search_text_trgm
  on public.orders using gin (search_text gin_trgm_ops);

create index if not exists idx_orders_created_at_desc
  on public.orders (created_at desc);
