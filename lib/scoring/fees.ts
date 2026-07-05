/**
 * eBay seller fee model for collectibles / trading cards (US).
 * Source: eBay seller fee schedule (2025). Approximate; tune as needed.
 *
 * - Final value fee on Trading Card Games: ~13.25% of (item + shipping) up to $7,500, then ~7%.
 * - Per-order fee: $0.30.
 * - We omit store subscription discounts and promoted listings ad spend.
 */

const FVF_RATE_TCG = 0.1325;
const FVF_RATE_HIGH = 0.07;
const FVF_TIER_BREAK = 7500;
const PER_ORDER_FEE = 0.3;

export type FeeInput = {
  salePrice: number;
  shippingChargedToBuyer?: number;
  sellerShippingCost?: number;
  paymentProcessingExtra?: number;
};

export type FeeBreakdown = {
  fvf: number;
  perOrder: number;
  shippingCost: number;
  total: number;
  netToSeller: number;
};

export function calcFees(input: FeeInput): FeeBreakdown {
  const shippingCharged = input.shippingChargedToBuyer ?? 0;
  const shippingCost = input.sellerShippingCost ?? 5;
  const fvfBase = input.salePrice + shippingCharged;

  let fvf: number;
  if (fvfBase <= FVF_TIER_BREAK) {
    fvf = fvfBase * FVF_RATE_TCG;
  } else {
    fvf = FVF_TIER_BREAK * FVF_RATE_TCG + (fvfBase - FVF_TIER_BREAK) * FVF_RATE_HIGH;
  }

  const perOrder = PER_ORDER_FEE;
  const extra = input.paymentProcessingExtra ?? 0;
  const total = fvf + perOrder + shippingCost + extra;
  const netToSeller = input.salePrice + shippingCharged - total;

  return { fvf, perOrder, shippingCost, total, netToSeller };
}
