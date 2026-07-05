export type DisplayOpportunity = {
  itemId: string;
  title: string;
  url: string;
  game: string;
  grader?: string | null;
  grade?: number | null;
  buyPrice: number;
  expectedSale: number;
  expectedNet: number;
  marginUsd: number;
  marginPct: number;
  confidence: number;
  compSource: string;
  compCount: number;
  sellerFeedbackPct?: number | null;
  sellerFeedbackCount?: number | null;
};

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtPct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export function OpportunityTable({ rows }: { rows: DisplayOpportunity[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
        No opportunities cleared thresholds. Tune <code>MIN_MARGIN_USD</code>,{" "}
        <code>MIN_MARGIN_PCT</code>, <code>MIN_CONFIDENCE</code> in{" "}
        <code>.env.local</code> if you want to see borderline hits.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wider text-neutral-400">
          <tr>
            <th className="px-4 py-3">Listing</th>
            <th className="px-4 py-3 text-right">Buy</th>
            <th className="px-4 py-3 text-right">Expected sale</th>
            <th className="px-4 py-3 text-right">Net</th>
            <th className="px-4 py-3 text-right">Margin</th>
            <th className="px-4 py-3 text-right">Confidence</th>
            <th className="px-4 py-3 text-right">Seller</th>
            <th className="px-4 py-3 text-right">Comps</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {rows.map((r) => (
            <tr key={r.itemId} className="hover:bg-neutral-950">
              <td className="px-4 py-3 align-top">
                <a
                  className="text-blue-400 hover:underline"
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.title}
                </a>
                <div className="text-xs text-neutral-500">
                  {r.game}
                  {r.grader ? ` · ${r.grader} ${r.grade ?? ""}` : ""}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtUsd(r.buyPrice)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtUsd(r.expectedSale)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtUsd(r.expectedNet)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className="font-medium text-emerald-400">{fmtUsd(r.marginUsd)}</span>
                <span className="ml-1 text-xs text-neutral-500">{fmtPct(r.marginPct)}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtPct(r.confidence)}</td>
              <td className="px-4 py-3 text-right text-xs text-neutral-400">
                {r.sellerFeedbackPct != null
                  ? `${r.sellerFeedbackPct}% (${r.sellerFeedbackCount ?? 0})`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right text-xs text-neutral-400">
                {r.compSource} · n={r.compCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
