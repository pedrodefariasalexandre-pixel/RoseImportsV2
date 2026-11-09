import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { couponAvailability } from "@/lib/coupons";

/**
 * Cupom que o pop-up da loja divulga.
 *
 * Quem decide é o painel (/admin/cupons), sem mexer em código: o cupom
 * aparece no pop-up quando está ATIVO, marcado como "Aparece na vitrine" e
 * dentro do período (início e fim). Quando o período acaba, o pop-up some
 * sozinho; quando o próximo cupom começa, ele assume.
 *
 * Só código, porcentagem e data final saem daqui. Nada de uso, limite ou
 * influenciador chega ao navegador.
 */

export const FEATURED_COUPON_TAG = "featured-coupon";

export type FeaturedCoupon = {
  code: string;
  discountPercent: number;
  expiresAt: string | null;
};

async function loadFeaturedCoupon(): Promise<FeaturedCoupon | null> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("coupons")
    .select(
      "code, discount_percent, starts_at, expires_at, max_uses, uses_reserved, active",
    )
    .eq("active", true)
    .eq("show_in_showcase", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  // O pop-up é enfeite: se a consulta falhar, a loja segue sem ele.
  if (error || !data) return null;

  const now = new Date();

  const available = data.filter(
    (coupon) =>
      couponAvailability(
        {
          active: coupon.active,
          startsAt: coupon.starts_at,
          expiresAt: coupon.expires_at,
          maxUses: coupon.max_uses,
          usesReserved: coupon.uses_reserved,
        },
        now,
      ) === "disponivel",
  );

  // Se dois períodos se sobrepuserem, vale o que começou por último
  // (a campanha mais nova); no empate, o de maior desconto.
  available.sort((a, b) => {
    const startA = a.starts_at ? new Date(a.starts_at).getTime() : 0;
    const startB = b.starts_at ? new Date(b.starts_at).getTime() : 0;

    if (startA !== startB) return startB - startA;

    return b.discount_percent - a.discount_percent;
  });

  const coupon = available[0];

  if (!coupon) return null;

  return {
    code: coupon.code,
    discountPercent: coupon.discount_percent,
    expiresAt: coupon.expires_at,
  };
}

/**
 * Cache curto: a home não consulta o banco a cada visita. O painel também
 * invalida a tag ao salvar um cupom, então a troca é praticamente imediata.
 */
export const getFeaturedCoupon = unstable_cache(
  loadFeaturedCoupon,
  ["featured-coupon"],
  { revalidate: 60, tags: [FEATURED_COUPON_TAG] },
);
