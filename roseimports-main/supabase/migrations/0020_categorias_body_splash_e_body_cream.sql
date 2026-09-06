-- =============================================================
-- 0020 — categorias próprias para Body Splash e Body Cream
--
-- O catálogo passa a refletir os três grupos comerciais mostrados
-- ao cliente. Os produtos existentes são migrados pelo product_type,
-- sem alterar preço, estoque, imagens ou publicação.
-- =============================================================

begin;

insert into public.categories (name, slug, active, sort_order)
values
  ('Body Splash', 'body-splash', true, 2),
  ('Body Cream',  'body-cream',  true, 3)
on conflict (slug) do update
set name = excluded.name,
    active = true,
    sort_order = excluded.sort_order;

update public.categories
   set sort_order = 1
 where slug = 'perfumes';

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
    when new.product_type = 'cosmetico' then 'body-cream'
    else null
  end;

  if v_expected_slug is null or v_category_slug <> v_expected_slug then
    raise exception 'product_category_type_mismatch';
  end if;

  return new;
end;
$$;

update public.products product
   set category_id = category.id
  from public.categories category
 where product.product_type = 'body_splash'
   and category.slug = 'body-splash'
   and product.category_id <> category.id;

update public.products product
   set category_id = category.id
  from public.categories category
 where product.product_type = 'cosmetico'
   and category.slug = 'body-cream'
   and product.category_id <> category.id;

-- A categoria genérica fica preservada para histórico, mas não aparece mais
-- nos filtros nem pode receber novos produtos.
update public.categories
   set active = false
 where slug = 'cosmeticos';

commit;
