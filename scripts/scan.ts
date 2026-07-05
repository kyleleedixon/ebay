import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { runScan } from "../lib/scanner/run";

async function main() {
  const persist = process.argv.includes("--persist");
  const debug = process.argv.includes("--debug");
  if (debug) {
    process.env.MIN_MARGIN_USD = "0";
    process.env.MIN_MARGIN_PCT = "0";
    process.env.MIN_CONFIDENCE = "0";
    process.env.MIN_SELLER_FEEDBACK_PCT = "0";
    process.env.MIN_SELLER_FEEDBACK_COUNT = "0";
  }
  console.log(`Running scan… persist=${persist} debug=${debug}`);
  const t0 = Date.now();
  const summary = await runScan({
    persist,
    onProgress: (phase, detail) => {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  [${elapsed}s ${phase}] ${detail ?? ""}`);
    },
  });
  console.log(`Searches:    ${summary.searchesRun}`);
  console.log(`Listings:    ${summary.listingsExamined}`);
  console.log(`Hits:        ${summary.opportunitiesFound}`);
  if (summary.errors.length) {
    console.log("\nErrors:");
    summary.errors.forEach((e) => console.log(" -", e));
  }
  console.log("\nTop opportunities:");
  summary.opportunities
    .sort((a, b) => b.marginUsd * b.confidence - a.marginUsd * a.confidence)
    .slice(0, 10)
    .forEach((o, i) => {
      const seller =
        o.sellerFeedbackPct !== null
          ? `seller ${o.sellerFeedbackPct}% (${o.sellerFeedbackCount} reviews)`
          : "seller unknown";
      console.log(
        `\n${i + 1}. ${o.title}\n   buy $${o.buyPrice.toFixed(2)}  ->  net $${o.expectedNet.toFixed(2)}  ` +
          `margin $${o.marginUsd.toFixed(2)} (${(o.marginPct * 100).toFixed(0)}%)  conf ${(o.confidence * 100).toFixed(0)}%  ` +
          `[${o.compSource} n=${o.comp.count}]\n   ${seller}\n   ${o.url}`,
      );
    });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
