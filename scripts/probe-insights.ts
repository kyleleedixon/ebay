import { config } from "dotenv";
config({ path: ".env.local" });
import { getAppToken } from "../lib/ebay/auth";

async function main() {
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
  console.log("HTTP", res.status);
  const text = await res.text();
  console.log(text.slice(0, 500));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
