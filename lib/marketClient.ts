// lib/marketClient.ts
export type PriceReq =
  | { symbol: string; type: 'entry'; tweetTimestamp: string }  // ISO timestamp
  | { symbol: string; type: 'latest' };

export type PriceResp = {
  symbol: string;
  type: 'entry' | 'latest';
  date: string | null;   // YYYY-MM-DD for entry, null or YYYY-MM-DD for latest
  price: number | null;
  asof: string | null;   // YYYY-MM-DD (source EOD date)
};

let MARKET_BASE_URL = process.env.MARKET_BASE_URL ?? 'http://localhost:8000';

export const setMarketBaseUrl = (url: string) => {
  MARKET_BASE_URL = url;
  // eslint-disable-next-line no-console
  console.log("MARKET_BASE_URL =", MARKET_BASE_URL);
};

export async function batchFetchPrices(requests: PriceReq[]): Promise<PriceResp[]> {
  // de-dupe identical requests (symbol+type+tweetTimestamp date part)
  const key = (r: PriceReq) =>
    r.type === 'entry'
      ? `${r.symbol}|entry|${new Date(r.tweetTimestamp).toISOString().slice(0,10)}`
      : `${r.symbol}|latest`;

  const map = new Map<string, PriceReq>();
  for (const r of requests) map.set(key(r), r);
  const unique = Array.from(map.values());

  const res = await fetch(`${MARKET_BASE_URL}/api/quotes/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: unique }),
  });

  if (!res.ok) throw new Error(`batchFetchPrices failed ${res.status}`);
  const json = await res.json();
  return json.data as PriceResp[];
}

export async function getDividends(symbol: string, range = '5y') {
  const res = await fetch(`${MARKET_BASE_URL}/api/dividends?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`);
  if (!res.ok) throw new Error(`getDividends failed ${res.status}`);
  return (await res.json()) as { date: string; amount: number }[];
}
