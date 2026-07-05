import type { BrowseItemSummary, SoldItem } from "@/lib/ebay/types";
import { browseSearch } from "@/lib/ebay/browse";
import { insightsSearch, insightsEnabled } from "@/lib/ebay/insights";
import { parseTitle, type CardKey } from "@/lib/cards/parser";
import { gradeKey } from "@/lib/cards/grades";

export type CompStats = {
  source: "sold" | "active";
  count: number;
  median: number;
  mean: number;
  p25: number;
  p75: number;
  stdev: number;
  sampleTitles: string[];
};

export type CompResult = {
  key: CardKey;
  query: string;
  stats: CompStats | null;
};

function priceNumber(p?: { value: string }): number | null {
  if (!p) return null;
  const n = Number(p.value);
  return Number.isFinite(n) ? n : null;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function summarize(prices: number[]): CompStats | null {
  if (prices.length < 3) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const variance =
    sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length;
  return {
    source: "active",
    count: sorted.length,
    median: quantile(sorted, 0.5),
    mean,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    stdev: Math.sqrt(variance),
    sampleTitles: [],
  };
}

function sameKey(a: CardKey, b: CardKey): boolean {
  // Hard gates: identity-defining attributes must match exactly.
  if (a.game !== b.game) return false;
  if (a.language !== b.language) return false;
  if (gradeKey(a.grade) !== gradeKey(b.grade)) return false;

  // Evidence score: enough independent signals to be confident it's the
  // same card. Two strong signals (e.g. name + number, or set + number)
  // are sufficient; a single signal is not.
  let evidence = 0;
  if (a.set && b.set && a.set === b.set) evidence += 2;
  if (a.name && b.name && a.name === b.name) evidence += 2;
  if (a.number && b.number && a.number === b.number) evidence += 2;
  if (a.year && b.year && a.year === b.year) evidence += 1;
  if (a.variant && b.variant && a.variant === b.variant) evidence += 1;

  return evidence >= 4;
}

function compQuery(key: CardKey): string {
  const parts = [
    key.name,
    key.number,
    key.set,
    key.grade.grader !== "RAW" ? `${key.grade.grader} ${key.grade.numeric}` : undefined,
  ].filter(Boolean);
  // English-only: exclude language tokens so the comp pool doesn't pull in
  // Japanese/Chinese listings that would skew prices.
  return `${parts.join(" ")} -japanese -japan -chinese -korean -german`;
}

export async function fetchComps(key: CardKey): Promise<CompResult> {
  const query = compQuery(key);
  if (!query.trim()) return { key, query, stats: null };

  // Prefer sold comps
  if (insightsEnabled()) {
    const sold = await insightsSearch({
      q: query,
      limit: 50,
      filter: ["soldItemsOnly:true"],
    });
    const items = sold?.itemSales ?? [];
    const matched = items.filter((it: SoldItem) => sameKey(parseTitle(it.title), key));
    const prices = matched
      .map((it) => priceNumber(it.lastSoldPrice))
      .filter((n): n is number => n !== null);
    const stats = summarize(prices);
    if (stats) {
      stats.source = "sold";
      stats.sampleTitles = matched.slice(0, 5).map((it) => it.title);
      return { key, query, stats };
    }
  }

  // Fallback: active listings (noisier).
  const active = await browseSearch({
    q: query,
    limit: 50,
    sort: "endingSoonest",
    filter: ["buyingOptions:{FIXED_PRICE}"],
  });
  const items: BrowseItemSummary[] = active.itemSummaries ?? [];
  const matched = items.filter((it) => sameKey(parseTitle(it.title), key));
  const prices = matched
    .map((it) => priceNumber(it.price))
    .filter((n): n is number => n !== null);
  const stats = summarize(prices);
  if (stats) stats.sampleTitles = matched.slice(0, 5).map((it) => it.title);
  return { key, query, stats };
}
