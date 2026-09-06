-- =============================================================
-- Rose Imports — 0017_admin_resumos_e_listagens
--
-- Depende de 0016_busca_sem_acentos (normalize_search_text() e
-- products.search_text): admin_stock_rows() busca por ali para não
-- reintroduzir uma busca sensível a acento que aquela migração já
-- havia corrigido no resto do painel.
--
-- Painel fazia no JavaScript o que é trabalho de banco: puxava o
-- catálogo inteiro para contar, para tirar duplicata de marca e para
-- paginar. Cada tela do admin gastava de 4 a 8 idas ao Supabase em
-- série, e a conta crescia junto com o catálogo.
--
-- Aqui as agregações voltam para o Postgres. Todas as funções são
-- somente-leitura (`stable`), então não há caminho de escrita novo.
--
-- Por que `security definer` e não `invoker`:
--   as policies de products/product_variants chamam is_admin() por
--   linha. Numa contagem de catálogo inteiro isso é uma subconsulta
--   por registro. Aqui a permissão é checada UMA vez, no topo, e a
--   varredura roda limpa. Quem não é admin recebe exceção — não uma
--   resposta parcial com os números públicos, que seria pior: número
--   errado sem aviso. (§34)
-- =============================================================

-- -------------------------------------------------------------
-- admin_can_read — quem pode ler os resumos abaixo.
--
-- is_admin() cobre o painel. A service role entra junto porque já
-- ignora RLS em toda tabela do banco: barrá-la aqui não protegeria
-- nada e deixaria script de manutenção e de teste sem caminho.
-- -------------------------------------------------------------
create or replace function public.admin_can_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select public.is_admin() or auth.role() = 'service_role';
$fn$;

revoke all on function public.admin_can_read() from public, anon;
grant execute on function public.admin_can_read() to authenticated;

-- -------------------------------------------------------------
-- admin_catalog_summary — os números do resumo de Produtos e de
-- Estoque, em uma ida só.
--
-- As duas telas leem daqui pelo mesmo motivo de sempre: contagem
-- duplicada volta a divergir na primeira alteração.
--
-- Definições, uma vez:
--   produtos_total       → todo registro em products.
--   produtos_ativos      → products.active.
--   variantes_ativas     → variante ativa de produto ativo.
--   ativos_sem_estoque   → produto ativo, com variante ativa, cuja
--                          soma de estoque zerou.
--   unidades_total       → soma do estoque das variantes ativas.
--   variantes_criticas   → variante ativa com 1 ou 2 unidades.
--   variantes_sem_estoque→ variante ativa zerada.
-- -------------------------------------------------------------
create or replace function public.admin_catalog_summary()
returns table (
  produtos_total        integer,
  produtos_ativos       integer,
  variantes_ativas      integer,
  ativos_sem_estoque    integer,
  unidades_total        integer,
  variantes_criticas    integer,
  variantes_sem_estoque integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_can_read() then
    raise exception 'not_authorized';
  end if;

  return query
  with vendaveis as (
    -- Variante à venda: ativa e de produto ativo. É a mesma régua que
    -- a tela de Estoque aplicava no JavaScript.
    select v.product_id, v.stock_quantity
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.active and p.active
  ),
  por_produto as (
    select p.id,
           count(x.product_id)                          as variantes,
           coalesce(sum(x.stock_quantity), 0)           as estoque
      from public.products p
      left join vendaveis x on x.product_id = p.id
     where p.active
     group by p.id
  )
  select
    (select count(*) from public.products)::integer,
    (select count(*) from public.products where active)::integer,
    (select count(*) from vendaveis)::integer,
    (select count(*) from por_produto
      where variantes > 0 and estoque <= 0)::integer,
    -- greatest(): estoque negativo não existe hoje (há check >= 0),
    -- mas somar um negativo mascararia o total se algum dia existir.
    (select coalesce(sum(greatest(stock_quantity, 0)), 0)
       from vendaveis)::integer,
    (select count(*) from vendaveis
      where stock_quantity between 1 and 2)::integer,
    (select count(*) from vendaveis
      where stock_quantity <= 0)::integer;
end;
$$;

revoke all on function public.admin_catalog_summary() from public, anon;
grant execute on function public.admin_catalog_summary() to authenticated;

-- -------------------------------------------------------------
-- admin_product_brands — marcas distintas para o seletor de filtro.
--
-- Antes: o painel lia a coluna brand de TODOS os produtos e montava
-- um Set no JavaScript. Payload crescia junto com o catálogo para
-- preencher um <select> de algumas dezenas de opções.
--
-- trim() aqui reproduz o trim() que o painel fazia: "Dior" e "Dior "
-- são a mesma marca e não podem aparecer duas vezes.
-- -------------------------------------------------------------
create or replace function public.admin_product_brands()
returns table (brand text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_can_read() then
    raise exception 'not_authorized';
  end if;

  return query
    select distinct trim(p.brand)
      from public.products p
     where p.brand is not null
       and trim(p.brand) <> ''
     order by 1;
end;
$$;

revoke all on function public.admin_product_brands() from public, anon;
grant execute on function public.admin_product_brands() to authenticated;

-- -------------------------------------------------------------
-- admin_stock_rows — a listagem da tela de Estoque, paginada.
--
-- Antes: a tela trazia TODA variante com o produto e TODAS as
-- imagens aninhadas, e então filtrava, buscava, ordenava e paginava
-- em memória. Uma busca por "30" carregava o estoque inteiro.
--
-- O PostgREST não resolvia isso sozinho: `or` no nível de cima não
-- alcança coluna de tabela embutida, e a busca precisa casar nome do
-- produto OU rótulo da versão.
--
-- A busca usa normalize_search_text() (migração 0016_busca_sem_acentos,
-- de leticiarochavf): mesma forma sem acento e sem maiúscula que o resto
-- do painel já usa desde então. products.search_text é coluna gerada e
-- indexada; o rótulo da versão não tem coluna própria — normaliza na
-- hora, sobre uma tabela pequena, sem custo que justifique gerar coluna.
--
-- p_filtro:
--   'todos'       → tudo, inclusive inativo (é uma tela de gestão).
--   'criticos'    → à venda, 1 ou 2 unidades.
--   'sem-estoque' → à venda, zerado.
--
-- total_count repete em toda linha: é `count(*) over ()`, o total do
-- conjunto filtrado ANTES do recorte da página. Com zero resultados
-- não vem linha nenhuma, e aí o total é zero por definição.
-- -------------------------------------------------------------
create or replace function public.admin_stock_rows(
  p_filtro text    default 'todos',
  p_busca  text    default '',
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id                 uuid,
  label              text,
  price_cents        integer,
  stock_quantity     integer,
  active             boolean,
  product_name       text,
  product_active     boolean,
  cover_storage_path text,
  total_count        bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- normalize_search_text() já reduz tudo a [a-z0-9 ]: "%" e "_" viram
  -- espaço antes de chegar ao LIKE, então o termo não precisa de escape.
  v_busca text := nullif(public.normalize_search_text(coalesce(p_busca, '')), '');
begin
  if not public.admin_can_read() then
    raise exception 'not_authorized';
  end if;

  return query
  with filtrado as (
    select
      v.id,
      v.label,
      v.price_cents,
      v.stock_quantity,
      v.active,
      p.name   as product_name,
      p.active as product_active,
      v.sort_order,
      (
        select i.storage_path
          from public.product_images i
         where i.product_id = p.id
         -- id no desempate: sem ele, duas imagens com o mesmo
         -- sort_order trocariam de capa entre um F5 e outro.
         order by i.sort_order, i.id
         limit 1
      ) as cover_storage_path
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where
       case p_filtro
         when 'criticos'    then v.active and p.active
                                 and v.stock_quantity between 1 and 2
         when 'sem-estoque' then v.active and p.active
                                 and v.stock_quantity <= 0
         else true
       end
       and (
         v_busca is null
         or p.search_text like '%' || v_busca || '%'
         or public.normalize_search_text(v.label) like '%' || v_busca || '%'
       )
  )
  select
    f.id,
    f.label,
    f.price_cents,
    f.stock_quantity,
    f.active,
    f.product_name,
    f.product_active,
    f.cover_storage_path,
    count(*) over () as total_count
    from filtrado f
   order by f.product_name, f.sort_order, f.id
   limit  greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_stock_rows(text, text, integer, integer)
  from public, anon;
grant execute on function public.admin_stock_rows(text, text, integer, integer)
  to authenticated;

-- -------------------------------------------------------------
-- admin_order_status_counts — o resumo da tela de Pedidos.
--
-- Uma ida ao banco no lugar de uma contagem por status.
-- -------------------------------------------------------------
create or replace function public.admin_order_status_counts()
returns table (
  total          integer,
  novo           integer,
  em_atendimento integer,
  pago           integer,
  entregue       integer,
  retirado       integer,
  cancelado      integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_can_read() then
    raise exception 'not_authorized';
  end if;

  return query
    select
      count(*)::integer,
      count(*) filter (where o.status = 'novo')::integer,
      count(*) filter (where o.status = 'em_atendimento')::integer,
      count(*) filter (where o.status = 'pago')::integer,
      count(*) filter (where o.status = 'entregue')::integer,
      count(*) filter (where o.status = 'retirado')::integer,
      count(*) filter (where o.status = 'cancelado')::integer
      from public.orders o;
end;
$$;

revoke all on function public.admin_order_status_counts() from public, anon;
grant execute on function public.admin_order_status_counts() to authenticated;

-- -------------------------------------------------------------
-- Índices de apoio.
--
-- Toda listagem do painel ordena por nome; o índice que existia era
-- trigram (serve para busca por semelhança, não para ordenação).
-- Em 91 produtos não muda nada; é o índice que evita o sort completo
-- quando o catálogo crescer.
-- -------------------------------------------------------------
create index if not exists idx_products_name
  on public.products (name);

create index if not exists idx_variants_stock
  on public.product_variants (stock_quantity);
