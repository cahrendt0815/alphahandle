// lib/marketClient.ts
const DEFAULT_BASE = process.env.MARKET_BASE_URL || "http://localhost:8000";
let MARKET_BASE_URL = DEFAULT_BASE;

export function setMarketBaseUrl(url: string) {
  if (url && typeof url === "string") MARKET_BASE_URL = url;
  // Helpful during dev
  // eslint-disable-next-line no-console
  console.log("MARKET_BASE_URL =", MARKET_BASE_URL);
}

type PriceReq = {
  symbol: string;
  type: "entry" | "latest";
  tweetTimestamp?: string; // ISO string required for "entry"
};

type BatchResponse = {
  data: Array<{ symbol: string; type: "entry" | "latest"; date: string | null; price: number | null; asof: string | null }>;
  errors: Array<{ message: string; symbol?: string; type?: string }>;
};

export async function batchFetchPrices(requests: PriceReq[]): Promise<BatchResponse> {
  const url = `${MARKET_BASE_URL}/api/quotes/batch`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    throw new Error(`batchFetchPrices failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as BatchResponse;
}

export async function getDividends(symbol: string, range = "5y"): Promise<Array<{ date: string; amount: number }>> {
  const url = `${MARKET_BASE_URL}/api/dividends?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getDividends failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as Array<{ date: string; amount: number }>;
}

// Initialize with default value at import time
setMarketBaseUrl(MARKET_BASE_URL);
