// lib/pipeline/pricing.ts
import { batchFetchPrices, PriceReq, PriceResp } from '../marketClient';
import { computeReturn, computeAlpha, summarize } from '../metrics';

// A normalized recommendation shape we expect:
export type Rec = {
  symbol: string;            // e.g. "AAPL"
  stance: 'long'|'short';
  tweetTimestamp: string;    // ISO
  // optional existing fields...
};

export type RecWithPrices = Rec & {
  entryPrice?: number|null;
  latestPrice?: number|null;
  spyEntry?: number|null;
  spyLatest?: number|null;
  ret?: number|null;
  spyRet?: number|null;
  alpha?: number|null;
  asofEntry?: string|null;
  asofLatest?: string|null;
};

export async function priceAndCompute(recs: Rec[], opts?: { spySymbol?: string }) {
  const spy = (opts?.spySymbol ?? 'SPY').toUpperCase();

  // Build batch requests
  const requests: PriceReq[] = [];
  for (const r of recs) {
    requests.push({ symbol: r.symbol.toUpperCase(), type: 'entry', tweetTimestamp: r.tweetTimestamp });
    requests.push({ symbol: r.symbol.toUpperCase(), type: 'latest' });
  }
  // Add SPY baseline
  // Use the same tweet timestamps as the recs to align entry dates
  for (const r of recs) requests.push({ symbol: spy, type: 'entry', tweetTimestamp: r.tweetTimestamp });
  requests.push({ symbol: spy, type: 'latest' });

  const priceRows: PriceResp[] = await batchFetchPrices(requests);

  // Index results
  const idx = new Map<string, PriceResp>();
  const k = (s: string, t: 'entry'|'latest', d?: string|null) =>
    t === 'entry' ? `${s}|entry|${d}` : `${s}|latest`;

  for (const row of priceRows) {
    const dateKey = row.type === 'entry' ? row.date : null;
    idx.set(k(row.symbol.toUpperCase(), row.type, dateKey), row);
  }

  // Attach prices and compute metrics
  const out: RecWithPrices[] = recs.map(r => {
    const sym = r.symbol.toUpperCase();
    // Derive the entry date key: API resolves next trading day based on tweetTimestamp,
    // but it returns the actual used date in row.date. We need to find the row by DATE.
    // Because we don't have it here, we approximate by trying the date portion of tweetTimestamp;
    // the server advances if needed. So we use that original date key for lookup.
    const entryDateKey = new Date(r.tweetTimestamp).toISOString().slice(0,10);

    const entry = idx.get(`${sym}|entry|${entryDateKey}`) || null;
    const latest = idx.get(`${sym}|latest`) || null;

    const spyEntry = idx.get(`${spy}|entry|${entryDateKey}`) || null;
    const spyLatest = idx.get(`${spy}|latest`) || null;

    const entryPrice = entry?.price ?? null;
    const latestPrice = latest?.price ?? null;
    const spyEntryPrice = spyEntry?.price ?? null;
    const spyLatestPrice = spyLatest?.price ?? null;

    const ret = (entryPrice!=null && latestPrice!=null)
      ? computeReturn(r.stance, entryPrice, latestPrice) : null;

    const spyRet = (spyEntryPrice!=null && spyLatestPrice!=null)
      ? (spyLatestPrice / spyEntryPrice) - 1 : null;

    const alpha = computeAlpha(ret, spyRet);

    return {
      ...r,
      entryPrice, latestPrice,
      spyEntry: spyEntryPrice, spyLatest: spyLatestPrice,
      ret, spyRet, alpha,
      asofEntry: entry?.asof ?? null,
      asofLatest: latest?.asof ?? null,
    };
  });

  const summary = summarize(out.map(x => ({ ret: x.ret ?? null, alpha: x.alpha ?? null })));
  return { recs: out, summary };
}
