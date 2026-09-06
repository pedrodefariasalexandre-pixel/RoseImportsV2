import { createClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------
   Contagens do catálogo, em um lugar só.

   Estoque e Produtos mostravam números próprios sob rótulos parecidos:
   uma tela contava versões e chamava de "produtos ativos", a outra
   contava produtos. Duas contagens independentes voltam a divergir na
   primeira alteração, então as duas telas passam a ler daqui.

   Definições, uma vez:

   - produtosTotal        → todo registro em products, ativo ou não.
   - produtosAtivos       → products.active = true.
   - variantesAtivas      → versão ativa de um produto também ativo. Versão
                            ativa de produto desativado não está à venda e
                            não entra na conta.
   - ativosSemEstoque     → produto ativo, com versões ativas, cuja soma de
                            estoque zerou.
   - unidadesTotal        → soma do estoque das versões à venda.
   - variantesCriticas    → versão à venda com 1 ou 2 unidades.
   - variantesSemEstoque  → versão à venda zerada.

   As três primeiras vinham de três consultas com `count: exact`; as demais
   vinham de varreduras que traziam o catálogo inteiro só para reduzir no
   JavaScript. Eram 5 idas ao Supabase por tela. Agora é uma chamada à
   função admin_catalog_summary(), que faz as sete contas em uma passada.
   (migration 0016)
   --------------------------------------------------------------- */

export type CatalogCounts = {
  produtosTotal: number;
  produtosAtivos: number;
  variantesAtivas: number;
  ativosSemEstoque: number;
  unidadesTotal: number;
  variantesCriticas: number;
  variantesSemEstoque: number;
};

export async function getCatalogCounts(): Promise<CatalogCounts> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("admin_catalog_summary")
    .single();

  if (error) throw new Error(error.message);

  return {
    produtosTotal: data.produtos_total,
    produtosAtivos: data.produtos_ativos,
    variantesAtivas: data.variantes_ativas,
    ativosSemEstoque: data.ativos_sem_estoque,
    unidadesTotal: data.unidades_total,
    variantesCriticas: data.variantes_criticas,
    variantesSemEstoque: data.variantes_sem_estoque,
  };
}

/**
 * Marcas distintas do catálogo, para o seletor de filtro.
 *
 * O painel lia a coluna `brand` de todos os produtos e montava um Set no
 * JavaScript: payload proporcional ao catálogo para preencher um <select>
 * de algumas dezenas de opções. `distinct` é trabalho de banco. (perf)
 */
export async function getProductBrands(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_product_brands");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => row.brand);
}
