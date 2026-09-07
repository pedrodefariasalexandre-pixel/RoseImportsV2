-- =============================================================
-- 0023 — Um produto pode pertencer a várias famílias olfativas
--
-- A coluna products.olfactory_family_id é preservada temporariamente
-- como família principal para manter compatibilidade com importações
-- antigas. A nova relação muitos-para-muitos é a fonte usada pelo site.
-- =============================================================

begin;

create table public.product_olfactory_families (
  product_id uuid not null
    references public.products(id) on delete cascade,
  olfactory_family_id uuid not null
    references public.olfactory_families(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, olfactory_family_id)
);

create index idx_product_olfactory_families_family
  on public.product_olfactory_families (olfactory_family_id, product_id);

insert into public.product_olfactory_families (
  product_id,
  olfactory_family_id
)
select id, olfactory_family_id
  from public.products
 where olfactory_family_id is not null
on conflict do nothing;

alter table public.product_olfactory_families enable row level security;

create policy product_families_public_read
  on public.product_olfactory_families
  for select
  using (
    exists (
      select 1
        from public.products product
       where product.id = product_id
         and product.active
    )
    and exists (
      select 1
        from public.olfactory_families family
       where family.id = olfactory_family_id
         and family.active
    )
  );

create policy product_families_admin_all
  on public.product_olfactory_families
  for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.sync_primary_olfactory_family()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.product_olfactory_families
   where product_id = new.id;

  if new.olfactory_family_id is not null then
    insert into public.product_olfactory_families (
      product_id,
      olfactory_family_id
    ) values (
      new.id,
      new.olfactory_family_id
    );
  end if;

  return new;
end;
$$;

create trigger trg_products_sync_primary_olfactory_family
  after insert or update of olfactory_family_id on public.products
  for each row execute function public.sync_primary_olfactory_family();

create or replace function public.set_product_olfactory_families(
  p_product_id uuid,
  p_family_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_product_type text;
  v_family_ids uuid[] := coalesce(p_family_ids, '{}'::uuid[]);
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  select product_type
    into v_product_type
    from public.products
   where id = p_product_id;

  if not found then
    raise exception 'product_not_found';
  end if;

  if cardinality(v_family_ids) > 0
     and v_product_type not in ('perfume', 'body_splash') then
    raise exception 'olfactory_family_not_applicable';
  end if;

  if exists (
    select 1
      from unnest(v_family_ids) requested(family_id)
      left join public.olfactory_families family
        on family.id = requested.family_id
     where family.id is null
        or not family.active
  ) then
    raise exception 'invalid_olfactory_family';
  end if;

  -- Atualiza a coluna antiga primeiro. O trigger recria a família principal;
  -- em seguida substituímos pelo conjunto completo solicitado.
  update public.products
     set olfactory_family_id = v_family_ids[1]
   where id = p_product_id;

  delete from public.product_olfactory_families
   where product_id = p_product_id;

  insert into public.product_olfactory_families (
    product_id,
    olfactory_family_id
  )
  select p_product_id, family_id
    from (
      select distinct unnest(v_family_ids) as family_id
    ) requested;
end;
$$;

revoke all on function public.set_product_olfactory_families(uuid, uuid[])
  from public;
grant execute on function public.set_product_olfactory_families(uuid, uuid[])
  to authenticated;

commit;
