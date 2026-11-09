import { getFeaturedCoupon } from "./featured-coupon";
import { CouponPopup } from "./coupon-popup";

/** Servidor: descobre o cupom da vez e entrega ao pop-up. Sem cupom, não renderiza nada. */
export async function FeaturedCouponPopup() {
  const coupon = await getFeaturedCoupon();

  if (!coupon) return null;

  return (
    <CouponPopup
      code={coupon.code}
      discountPercent={coupon.discountPercent}
      expiresAt={coupon.expiresAt}
    />
  );
}
