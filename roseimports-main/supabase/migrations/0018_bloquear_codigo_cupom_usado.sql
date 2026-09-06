-- O código identifica a campanha e não pode mudar depois do primeiro uso.
-- A barreira no banco protege também contra requisições fora do painel e
-- fecha a corrida entre o primeiro pedido e uma edição simultânea.

create or replace function public.lock_used_coupon_code()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if old.uses_reserved > 0 and new.code is distinct from old.code then
    raise exception 'coupon_code_locked_after_use'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_coupons_lock_used_code on public.coupons;

create trigger trg_coupons_lock_used_code
  before update of code on public.coupons
  for each row execute function public.lock_used_coupon_code();
