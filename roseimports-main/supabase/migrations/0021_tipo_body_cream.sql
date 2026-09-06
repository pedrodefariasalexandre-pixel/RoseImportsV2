-- =============================================================
-- 0021 — Body Cream como tipo próprio
--
-- A categoria já existe desde 0020. Esta migração remove a classificação
-- técnica "cosmetico" e preserva os produtos existentes como body_cream.
-- =============================================================

begin;

alter table public.products
  drop constraint if exists products_product_type_check;

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
    else null
  end;

  if v_expected_slug is null or v_category_slug <> v_expected_slug then
    raise exception 'product_category_type_mismatch';
  end if;

  return new;
end;
$$;

update public.products
   set product_type = 'body_cream'
 where product_type = 'cosmetico';

alter table public.products
  add constraint products_product_type_check
  check (product_type in (
    'perfume',
    'body_splash',
    'body_cream',
    'eletronico',
    'acessorio'
  ));

-- A RPC de cadastro em lote foi renomeada para *_base em 0015. Atualizamos
-- apenas o valor aceito, preservando toda a lógica atômica já instalada.
do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.confirm_bulk_product_import_base(text,text,jsonb)'::regprocedure
  ) into v_definition;

  if position('''cosmetico''' in v_definition) = 0 then
    raise exception 'bulk_import_body_cream_source_not_found';
  end if;

  execute replace(v_definition, '''cosmetico''', '''body_cream''');
end;
$migration$;

commit;
