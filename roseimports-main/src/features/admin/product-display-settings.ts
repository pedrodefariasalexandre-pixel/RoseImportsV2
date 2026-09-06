import type { Product } from "@/types/database";

export function shouldShowProductDisplaySettings(
  product: Product | null,
): product is Product {
  return product !== null;
}
