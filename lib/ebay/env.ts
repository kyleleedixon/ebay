const env = process.env.EBAY_ENV === "SANDBOX" ? "SANDBOX" : "PRODUCTION";

export const EBAY_BASE_URL =
  env === "SANDBOX" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";

export const EBAY_MARKETPLACE_ID = "EBAY_US";

export function requireCreds() {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error(
      "Missing EBAY_APP_ID or EBAY_CERT_ID. Set them in .env.local (see .env.example).",
    );
  }
  return { appId, certId };
}
