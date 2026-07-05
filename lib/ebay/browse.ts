import { getAppToken } from "./auth";
import { EBAY_BASE_URL, EBAY_MARKETPLACE_ID } from "./env";
import type { BrowseSearchResponse } from "./types";

export type BrowseSearchInput = {
  q: string;
  categoryIds?: string[];
  filter?: string[];
  limit?: number;
  offset?: number;
  sort?: "price" | "-price" | "newlyListed" | "endingSoonest";
};

export async function browseSearch(input: BrowseSearchInput): Promise<BrowseSearchResponse> {
  const token = await getAppToken();
  const params = new URLSearchParams();
  params.set("q", input.q);
  if (input.categoryIds?.length) params.set("category_ids", input.categoryIds.join(","));
  if (input.filter?.length) params.set("filter", input.filter.join(","));
  if (input.limit) params.set("limit", String(input.limit));
  if (input.offset) params.set("offset", String(input.offset));
  if (input.sort) params.set("sort", input.sort);

  const url = `${EBAY_BASE_URL}/buy/browse/v1/item_summary/search?${params}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
    "X-EBAY-C-ENDUSERCTX": "contextualLocation=country=US,zip=10001",
  };

  // Single retry on transient network errors (ECONNRESET, socket hang up).
  // 15s per-request timeout so a stalled connection can't block the scan.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        throw new Error(`Browse search failed: ${res.status} ${await res.text()}`);
      }
      return (await res.json()) as BrowseSearchResponse;
    } catch (e) {
      lastErr = e;
      if (!isTransient(e)) throw e;
      await new Promise((r) => setTimeout(r, 500 + attempt * 750));
    }
  }
  throw lastErr;
}

function isTransient(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "TimeoutError" || e.name === "AbortError") return true;
  const cause = (e as { cause?: { code?: string } }).cause;
  const code = cause?.code ?? "";
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "UND_ERR_SOCKET" ||
    /socket hang up/i.test(e.message) ||
    /fetch failed/i.test(e.message)
  );
}
