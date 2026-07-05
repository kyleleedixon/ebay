import {
  pgTable,
  text,
  timestamp,
  doublePrecision,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const opportunities = pgTable(
  "opportunities",
  {
    itemId: text("item_id").primaryKey(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    canonicalKey: text("canonical_key").notNull(),
    game: text("game").notNull(),
    grader: text("grader"),
    grade: doublePrecision("grade"),
    buyPrice: doublePrecision("buy_price").notNull(),
    shippingIn: doublePrecision("shipping_in").notNull(),
    cost: doublePrecision("cost").notNull(),
    expectedSale: doublePrecision("expected_sale").notNull(),
    fees: doublePrecision("fees").notNull(),
    expectedNet: doublePrecision("expected_net").notNull(),
    marginUsd: doublePrecision("margin_usd").notNull(),
    marginPct: doublePrecision("margin_pct").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    compSource: text("comp_source").notNull(),
    compCount: integer("comp_count").notNull(),
    compMedian: doublePrecision("comp_median").notNull(),
    compP25: doublePrecision("comp_p25").notNull(),
    compP75: doublePrecision("comp_p75").notNull(),
    sellerFeedbackPct: doublePrecision("seller_feedback_pct"),
    sellerFeedbackCount: integer("seller_feedback_count"),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    dismissedAt: timestamp("dismissed_at"),
  },
  (t) => ({
    canonicalIdx: index("opportunities_canonical_idx").on(t.canonicalKey),
    marginIdx: index("opportunities_margin_idx").on(t.marginUsd),
    confidenceIdx: index("opportunities_confidence_idx").on(t.confidence),
  }),
);

export const scanRuns = pgTable("scan_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  searchesRun: integer("searches_run").notNull().default(0),
  listingsExamined: integer("listings_examined").notNull().default(0),
  opportunitiesFound: integer("opportunities_found").notNull().default(0),
  error: text("error"),
});

export const searches = pgTable(
  "searches",
  {
    id: text("id").primaryKey(),
    query: text("query").notNull(),
    categoryIds: text("category_ids"),
    filter: text("filter"),
    enabled: integer("enabled").notNull().default(1),
    lastRunAt: timestamp("last_run_at"),
  },
  (t) => ({
    queryIdx: uniqueIndex("searches_query_idx").on(t.query),
  }),
);
