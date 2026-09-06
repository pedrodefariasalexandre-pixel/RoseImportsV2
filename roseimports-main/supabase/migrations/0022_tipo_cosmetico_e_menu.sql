-- =============================================================
-- 0022 — Cosmético volta como tipo adicional
--
-- Body Cream continua independente. Cosmético é uma quarta opção de
-- cadastro, ligada à categoria genérica de cosméticos reativada aqui.
-- =============================================================

begin;

insert into public.categories (name, slug, active, sort_order)
values ('Cosméticos', 'cosmeticos', true, 4)
on conflict (slug) do update
set name = excluded.name,
    active = true,
    sort_order = excluded.sort_order;

alter table public.products
  drop constraint if exists products_product_type_check;

alter table public.products
  add constraint products_product_type_check
  check (product_type in (
    'perfume',
    'body_splash',
    'body_cream',
    'cosmetico',
    'eletronico',
    'acessorio'
  ));

create or replace function public.validate_product_category_type()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_category_slug text;
  v_category_active boolean;
  v_expected_slug text;
begin
  select slug, active
    into v_category_slug, v_category_active
    from public.categories
   where id = new.category_id;

  if not found or v_category_active is distinct from true then
    raise exception 'invalid_product_category';
  end if;

  v_expected_slug := case
    when new.product_type = 'perfume' then 'perfumes'
    when new.product_type = 'body_splash' then 'body-splash'
    when new.product_type = 'body_cream' then 'body-cream'
    when new.product_type = 'cosmetico' then 'cosmeticos'
    else null
  end;

  if v_expected_slug is null or v_category_slug <> v_expected_slug then
    raise exception 'product_category_type_mismatch';
  end if;

  return new;
end;
$$;

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.confirm_bulk_product_import_base(text,text,jsonb)'::regprocedure
  ) into v_definition;

  if position(
    $needle$('perfume', 'body_splash', 'body_cream')$needle$
    in v_definition
  ) = 0 then
    raise exception 'bulk_import_product_types_source_not_found';
  end if;

  execute replace(
    v_definition,
    $needle$('perfume', 'body_splash', 'body_cream')$needle$,
    $replacement$('perfume', 'body_splash', 'body_cream', 'cosmetico')$replacement$
  );
end;
$migration$;

commit;
