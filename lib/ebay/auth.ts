import { EBAY_BASE_URL, requireCreds } from "./env";

type CachedToken = { token: string; expiresAt: number };
let cache: CachedToken | null = null;
let inFlight: Promise<string> | null = null;

const APP_SCOPE = "https://api.ebay.com/oauth/api_scope";

export async function getAppToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt - 60_000 > now) return cache.token;
  if (inFlight) return inFlight;

  inFlight = fetchToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchToken(): Promise<string> {
  const { appId, certId } = requireCreds();
  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch(`${EBAY_BASE_URL}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: APP_SCOPE,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cache.token;
}
