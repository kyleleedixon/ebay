import { getAppToken } from "./auth";
import { EBAY_BASE_URL, EBAY_MARKETPLACE_ID } from "./env";
import type { InsightsResponse } from "./types";

export const insightsEnabled = () => process.env.EBAY_INSIGHTS_ENABLED === "true";

export type InsightsSearchInput = {
  q: string;
  categoryIds?: string[];
  filter?: string[];
  limit?: number;
};

/**
 * Marketplace Insights API: sold/completed listings.
 * Requires application approval for the buy.marketplace.insights scope.
 * Falls back silently if not enabled.
 */
export async function insightsSearch(
  input: InsightsSearchInput,
): Promise<InsightsResponse | null> {
  if (!insightsEnabled()) return null;

  const token = await getAppToken();
  const params = new URLSearchParams();
  params.set("q", input.q);
  if (input.categoryIds?.length) params.set("category_ids", input.categoryIds.join(","));
  if (input.filter?.length) params.set("filter", input.filter.join(","));
  if (input.limit) params.set("limit", String(input.limit));

  const res = await fetch(
    `${EBAY_BASE_URL}/buy/marketplace_insights/v1_beta/item_sales/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (res.status === 403) return null;
  if (!res.ok) {
    throw new Error(`Insights search failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as InsightsResponse;
}
