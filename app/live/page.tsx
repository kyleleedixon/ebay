import { Suspense } from "react";
import { runScan } from "@/lib/scanner/run";
import { OpportunityTable, type DisplayOpportunity } from "@/app/components/OpportunityTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

async function LiveResults() {
  const summary = await runScan({ persist: false });
  const rows: DisplayOpportunity[] = summary.opportunities
    .slice()
    .sort((a, b) => b.marginUsd * b.confidence - a.marginUsd * a.confidence)
    .map((o) => ({
      itemId: o.itemId,
      title: o.title,
      url: o.url,
      game: o.key.game,
      grader: o.key.grade.grader,
      grade: o.key.grade.numeric,
      buyPrice: o.buyPrice,
      expectedSale: o.expectedSale,
      expectedNet: o.expectedNet,
      marginUsd: o.marginUsd,
      marginPct: o.marginPct,
      confidence: o.confidence,
      compSource: o.compSource,
      compCount: o.comp.count,
      sellerFeedbackPct: o.sellerFeedbackPct,
      sellerFeedbackCount: o.sellerFeedbackCount,
    }));

  return (
    <>
      <div className="mb-4 text-sm text-neutral-400">
        Scanned <strong className="text-neutral-200">{summary.listingsExamined}</strong> listings
        across <strong className="text-neutral-200">{summary.searchesRun}</strong> searches ·{" "}
        <strong className="text-neutral-200">{summary.opportunitiesFound}</strong> hits
        {summary.errors.length > 0 && (
          <span className="ml-2 text-amber-400">· {summary.errors.length} errors</span>
        )}
      </div>
      <OpportunityTable rows={rows} />
    </>
  );
}

function Loading() {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
      Scanning eBay… this takes ~30–60 seconds. Don't reload.
    </div>
  );
}

export default function LivePage() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Live Scan</h1>
          <p className="text-sm text-neutral-400">
            Runs a fresh scan on every page load. No persistence — refresh to re-scan.
          </p>
        </div>
        <a className="text-xs text-blue-400 hover:underline" href="/">
          ← back to dashboard
        </a>
      </header>

      <Suspense fallback={<Loading />}>
        <LiveResults />
      </Suspense>
    </main>
  );
}
