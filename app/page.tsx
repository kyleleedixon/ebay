import { db, schema } from "@/lib/db";
import { desc, isNull, and, gte } from "drizzle-orm";
import { OpportunityTable, type DisplayOpportunity } from "@/app/components/OpportunityTable";

export const dynamic = "force-dynamic";

async function loadOpportunities(): Promise<DisplayOpportunity[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const d = db();
    const rows = await d
      .select()
      .from(schema.opportunities)
      .where(
        and(
          isNull(schema.opportunities.dismissedAt),
          gte(schema.opportunities.confidence, 0.6),
        ),
      )
      .orderBy(desc(schema.opportunities.marginUsd))
      .limit(100);
    return rows.map((r) => ({
      itemId: r.itemId,
      title: r.title,
      url: r.url,
      game: r.game,
      grader: r.grader,
      grade: r.grade,
      buyPrice: r.buyPrice,
      expectedSale: r.expectedSale,
      expectedNet: r.expectedNet,
      marginUsd: r.marginUsd,
      marginPct: r.marginPct,
      confidence: r.confidence,
      compSource: r.compSource,
      compCount: r.compCount,
      sellerFeedbackPct: r.sellerFeedbackPct,
      sellerFeedbackCount: r.sellerFeedbackCount,
    }));
  } catch {
    return [];
  }
}

export default async function Page() {
  const rows = await loadOpportunities();
  const dbConfigured = Boolean(process.env.DATABASE_URL);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Card Arbitrage</h1>
          <p className="text-sm text-neutral-400">
            eBay trading card opportunities — ranked by expected margin.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <a className="text-blue-400 hover:underline" href="/live">
            run live scan →
          </a>
          <span>{rows.length} active</span>
        </div>
      </header>

      {!dbConfigured && <SetupBanner />}

      {dbConfigured && <OpportunityTable rows={rows} />}
    </main>
  );
}

function SetupBanner() {
  return (
    <div className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-6 text-sm">
      <div className="font-medium text-amber-300">No database yet — that's fine.</div>
      <p className="text-amber-100/80">
        You can use the scanner right now without Postgres: open{" "}
        <a className="font-medium text-blue-400 hover:underline" href="/live">
          /live
        </a>{" "}
        to run a fresh scan and see all current opportunities.
      </p>
      <p className="text-amber-100/80">
        For persistent history + 15-min cron, set <code>DATABASE_URL</code> in{" "}
        <code>.env.local</code> (Neon free tier works) and run <code>npm run db:push</code>.
      </p>
    </div>
  );
}
