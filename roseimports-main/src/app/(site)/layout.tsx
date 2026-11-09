import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FooterSlot } from "@/components/footer-slot";
import { HeaderSlot } from "@/components/header-slot";
import { FeaturedCouponPopup } from "@/features/coupons/featured-coupon-popup";
import { Suspense } from "react";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col font-sans antialiased">
      <HeaderSlot>
        <SiteHeader />
      </HeaderSlot>

      <main className="flex-1">
        {children}
      </main>

      <FooterSlot>
        <SiteFooter />
      </FooterSlot>

      <Suspense fallback={null}>
        <FeaturedCouponPopup />
      </Suspense>
    </div>
  );
}
