import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  // Vercel Cron sets this header; reject anything else if CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await runScan({ persist: true });
    return NextResponse.json({
      ok: true,
      searchesRun: summary.searchesRun,
      listingsExamined: summary.listingsExamined,
      opportunitiesFound: summary.opportunitiesFound,
      errors: summary.errors,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
