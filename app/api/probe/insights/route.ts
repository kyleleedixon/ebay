import { NextResponse } from "next/server";
import { getAppToken } from "@/lib/ebay/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const token = await getAppToken();
    const res = await fetch(
      "https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?q=Charizard+PSA+10&limit=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      },
    );
    const body = await res.text();
    return NextResponse.json({
      status: res.status,
      approved: res.status === 200,
      preview: body.slice(0, 400),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
