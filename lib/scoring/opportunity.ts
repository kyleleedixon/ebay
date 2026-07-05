import type { BrowseItemSummary } from "@/lib/ebay/types";
import { calcFees } from "./fees";
import type { CompStats } from "./comps";
import { parseTitle, keyStrength, type CardKey } from "@/lib/cards/parser";

export type Opportunity = {
  itemId: string;
  title: string;
  url: string;
  imageUrl?: string;
  buyPrice: number;
  shippingIn: number;
  cost: number; // buyPrice + shippingIn
  expectedSale: number; // conservative comp
  fees: number;
  expectedNet: number;
  marginUsd: number;
  marginPct: number;
  confidence: number;
  sellerFeedbackPct: number | null;
  sellerFeedbackCount: number | null;
  key: CardKey;
  comp: CompStats;
  compSource: "sold" | "active";
};

const ACTIVE_DISCOUNT = 0.85; // active comps tend to be aspirational; conservative haircut.

export function scoreOpportunity(
  listing: BrowseItemSummary,
  comp: CompStats,
): Opportunity | null {
  const buyPrice = Number(listing.price?.value);
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) return null;

  const shippingIn = Number(listing.shippingOptions?.[0]?.shippingCost?.value ?? 0) || 0;
  const cost = buyPrice + shippingIn;

  // Conservative expected sale: 25th percentile, with extra haircut for active comps.
  const rawExpected = comp.p25;
  const expectedSale =
    comp.source === "active" ? rawExpected * ACTIVE_DISCOUNT : rawExpected;

  const fees = calcFees({
    salePrice: expectedSale,
    shippingChargedToBuyer: 0,
    sellerShippingCost: 5,
  });

  const expectedNet = fees.netToSeller;
  const marginUsd = expectedNet - cost;
  const marginPct = cost > 0 ? marginUsd / cost : 0;

  const key = parseTitle(listing.title);
  const sellerFeedbackPct = listing.seller?.feedbackPercentage
    ? Number(listing.seller.feedbackPercentage)
    : null;
  const sellerFeedbackCount = listing.seller?.feedbackScore ?? null;
  const confidence = computeConfidence({
    comp, key, marginPct, sellerFeedbackPct, sellerFeedbackCount,
  });

  return {
    itemId: listing.itemId,
    title: listing.title,
    url: listing.itemWebUrl,
    imageUrl: listing.image?.imageUrl,
    buyPrice,
    shippingIn,
    cost,
    expectedSale,
    fees: fees.total,
    expectedNet,
    marginUsd,
    marginPct,
    confidence,
    sellerFeedbackPct,
    sellerFeedbackCount,
    key,
    comp,
    compSource: comp.source,
  };
}

function computeConfidence(args: {
  comp: CompStats;
  key: CardKey;
  marginPct: number;
  sellerFeedbackPct: number | null;
  sellerFeedbackCount: number | null;
}): number {
  const { comp, key, marginPct, sellerFeedbackPct, sellerFeedbackCount } = args;

  // Sample size: 0..0.25
  const sampleScore = Math.min(comp.count / 20, 1) * 0.25;

  // Price stability (CoV): tighter = better. 0..0.2
  const cov = comp.median > 0 ? comp.stdev / comp.median : 1;
  const stabilityScore = Math.max(0, 1 - cov) * 0.2;

  // Source quality: sold > active. 0..0.15
  const sourceScore = comp.source === "sold" ? 0.15 : 0.075;

  // Key strength. 0..0.15
  const keyScore = keyStrength(key) * 0.15;

  // Margin sanity: extreme margins are usually parser errors, not deals. 0..0.05
  const marginPenalty = marginPct > 1.5 ? 0 : 0.05;

  // Seller trust: 0..0.2
  // - Feedback % under 98 is a strong negative signal.
  // - Feedback count proxies for track record.
  let sellerScore = 0;
  if (sellerFeedbackPct !== null && sellerFeedbackCount !== null) {
    const pctScore = Math.max(0, Math.min(1, (sellerFeedbackPct - 95) / 5)); // 95→0, 100→1
    const countScore = Math.min(1, Math.log10(sellerFeedbackCount + 1) / 3); // 1k≈1.0
    sellerScore = (pctScore * 0.6 + countScore * 0.4) * 0.2;
  } else {
    sellerScore = 0.1; // unknown seller: neutral-ish
  }

  return Math.max(0, Math.min(1,
    sampleScore + stabilityScore + sourceScore + keyScore + marginPenalty + sellerScore,
  ));
}
