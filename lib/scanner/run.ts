import { browseSearch } from "@/lib/ebay/browse";
import { parseTitle, keyStrength } from "@/lib/cards/parser";
import { fetchComps } from "@/lib/scoring/comps";
import { scoreOpportunity, type Opportunity } from "@/lib/scoring/opportunity";
import { SEED_SEARCHES } from "./searches";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { gradeKey } from "@/lib/cards/grades";

export type ScanSummary = {
  searchesRun: number;
  listingsExamined: number;
  opportunitiesFound: number;
  opportunities: Opportunity[];
  errors: string[];
};

export type ScanOptions = {
  persist?: boolean;
  onProgress?: (phase: string, detail?: string) => void;
};

const MIN_KEY_STRENGTH = 0.5;

function thresholds() {
  return {
    minMarginUsd: Number(process.env.MIN_MARGIN_USD ?? 15),
    minMarginPct: Number(process.env.MIN_MARGIN_PCT ?? 0.25),
    minConfidence: Number(process.env.MIN_CONFIDENCE ?? 0.6),
    minSellerFeedbackPct: Number(process.env.MIN_SELLER_FEEDBACK_PCT ?? 98),
    minSellerFeedbackCount: Number(process.env.MIN_SELLER_FEEDBACK_COUNT ?? 25),
  };
}

/** Run the full scan: query eBay, score, persist hits. */
export async function runScan(opts: ScanOptions = {}): Promise<ScanSummary> {
  const t = thresholds();
  const log = opts.onProgress ?? (() => {});
  const errors: string[] = [];
  const opportunities: Opportunity[] = [];
  let listingsExamined = 0;
  let searchesRun = 0;

  // Cache comps per canonical key to avoid re-querying within one scan.
  const compCache = new Map<string, Awaited<ReturnType<typeof fetchComps>>>();
  // Dedup listings across searches: a single itemId is scored at most once.
  const seenItemIds = new Set<string>();
  // Track best opportunity per canonical key — same card from multiple sellers
  // should collapse to the cheapest one.
  const bestByKey = new Map<string, ReturnType<typeof scoreOpportunity>>();

  // Each search runs twice: once newest-first (catches just-posted listings)
  // and once cheapest-first (catches underpriced older listings the newest
  // pass would miss). Dedup keeps the work down.
  const SORTS = ["newlyListed", "price"] as const;

  // Phase 1: run search/sort pairs in parallel with a concurrency cap.
  // eBay Browse API tolerates burst traffic but caps rate at ~5 req/s per
  // app; 8 concurrent workers keeps us comfortably under while still cutting
  // wall time by ~8×.
  const searchJobs = SEED_SEARCHES.flatMap((search) =>
    SORTS.map((sort) => ({ search, sort })),
  );

  log("phase1", `running ${searchJobs.length} searches (concurrency 8)`);
  let searchDone = 0;
  const searchResults = await mapWithConcurrency(searchJobs, 8, async ({ search, sort }) => {
    try {
      const res = await browseSearch({
        q: search.q,
        categoryIds: search.categoryIds,
        filter: search.filter,
        limit: 100,
        sort,
      });
      searchDone += 1;
      log("phase1", `${searchDone}/${searchJobs.length} · ${search.q} [${sort}] → ${(res.itemSummaries ?? []).length}`);
      return { search, sort, items: res.itemSummaries ?? [], error: null as string | null };
    } catch (e: unknown) {
      searchDone += 1;
      const msg = e instanceof Error ? e.message : String(e);
      log("phase1", `${searchDone}/${searchJobs.length} · ${search.q} [${sort}] ERROR ${msg}`);
      return { search, sort, items: [], error: msg };
    }
  });

  // Phase 2: dedup listings, apply cheap filters, collect (listing, key) pairs
  // that need comp lookups. No network calls in this phase.
  type Candidate = { listing: (typeof searchResults)[number]["items"][number]; key: ReturnType<typeof parseTitle> };
  const candidates: Candidate[] = [];

  for (const { search, sort, items, error } of searchResults) {
    searchesRun += 1;
    if (error) {
      errors.push(`${search.q} [${sort}]: ${error}`);
      continue;
    }

    for (const listing of items) {
      if (seenItemIds.has(listing.itemId)) continue;
      seenItemIds.add(listing.itemId);

      listingsExamined += 1;
      const key = parseTitle(listing.title);
      if (key.language !== "EN") continue;
      if (keyStrength(key) < MIN_KEY_STRENGTH) continue;

      const fbPct = listing.seller?.feedbackPercentage
        ? Number(listing.seller.feedbackPercentage)
        : null;
      const fbCount = listing.seller?.feedbackScore ?? null;
      if (fbPct !== null && fbPct < t.minSellerFeedbackPct) continue;
      if (fbCount !== null && fbCount < t.minSellerFeedbackCount) continue;

      candidates.push({ listing, key });
    }
  }

  // Phase 3: fetch comps for every unique canonical key in parallel.
  // This is the biggest wall-time saver — was previously one network call
  // per unique card, sequential.
  const uniqueKeys = Array.from(
    new Map(candidates.map((c) => [c.key.canonical, c.key])).values(),
  );
  log("phase3", `fetching comps for ${uniqueKeys.length} unique cards`);
  let compDone = 0;
  const compEntries = await mapWithConcurrency(uniqueKeys, 8, async (key) => {
    try {
      const comp = await fetchComps(key);
      compDone += 1;
      if (compDone % 25 === 0 || compDone === uniqueKeys.length) {
        log("phase3", `${compDone}/${uniqueKeys.length} comps fetched`);
      }
      return [key.canonical, comp] as const;
    } catch (e: unknown) {
      compDone += 1;
      errors.push(
        `comp ${key.canonical}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return [key.canonical, null] as const;
    }
  });
  for (const [canonical, comp] of compEntries) {
    if (comp) compCache.set(canonical, comp);
  }

  // Phase 4: score each candidate against its cached comps.
  for (const { listing, key } of candidates) {
    const comp = compCache.get(key.canonical);
    if (!comp?.stats) continue;

    const opp = scoreOpportunity(listing, comp.stats);
    if (!opp) continue;

    if (
      opp.marginUsd >= t.minMarginUsd &&
      opp.marginPct >= t.minMarginPct &&
      opp.confidence >= t.minConfidence
    ) {
      const existing = bestByKey.get(key.canonical);
      if (!existing || opp.marginUsd > existing.marginUsd) {
        bestByKey.set(key.canonical, opp);
      }
    }
  }

  for (const opp of bestByKey.values()) {
    if (opp) opportunities.push(opp);
  }

  if (opts.persist && opportunities.length) {
    await upsertOpportunities(opportunities);
  }

  return {
    searchesRun,
    listingsExamined,
    opportunitiesFound: opportunities.length,
    opportunities,
    errors,
  };
}

async function upsertOpportunities(opps: Opportunity[]) {
  const d = db();
  const rows = opps.map((o) => ({
    itemId: o.itemId,
    title: o.title,
    url: o.url,
    imageUrl: o.imageUrl,
    canonicalKey: o.key.canonical,
    game: o.key.game,
    grader: o.key.grade.grader,
    grade: o.key.grade.numeric ?? undefined,
    buyPrice: o.buyPrice,
    shippingIn: o.shippingIn,
    cost: o.cost,
    expectedSale: o.expectedSale,
    fees: o.fees,
    expectedNet: o.expectedNet,
    marginUsd: o.marginUsd,
    marginPct: o.marginPct,
    confidence: o.confidence,
    compSource: o.compSource,
    compCount: o.comp.count,
    compMedian: o.comp.median,
    compP25: o.comp.p25,
    compP75: o.comp.p75,
    sellerFeedbackPct: o.sellerFeedbackPct,
    sellerFeedbackCount: o.sellerFeedbackCount,
  }));

  await d
    .insert(schema.opportunities)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.opportunities.itemId,
      set: {
        buyPrice: sql`excluded.buy_price`,
        shippingIn: sql`excluded.shipping_in`,
        cost: sql`excluded.cost`,
        expectedSale: sql`excluded.expected_sale`,
        fees: sql`excluded.fees`,
        expectedNet: sql`excluded.expected_net`,
        marginUsd: sql`excluded.margin_usd`,
        marginPct: sql`excluded.margin_pct`,
        confidence: sql`excluded.confidence`,
        lastSeenAt: sql`now()`,
      },
    });
}

export { gradeKey };

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
