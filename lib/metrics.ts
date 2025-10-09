// lib/metrics.ts
export function computeReturn(stance: "long" | "short", entry: number, latest: number): number {
  if (!isFinite(entry) || !isFinite(latest) || entry <= 0 || latest <= 0) return NaN;
  return stance === "long" ? latest / entry - 1 : entry / latest - 1;
}

export function computeAlpha(ret: number, spyRet: number): number {
  if (!isFinite(ret) || !isFinite(spyRet)) return NaN;
  return ret - spyRet;
}

export function aggregateMetrics(records: { ret: number; alpha: number }[]) {
  const valid = records.filter(r => Number.isFinite(r.ret));
  const arr = <T extends number>(xs: T[]) => xs.filter(Number.isFinite) as number[];
  const rets = arr(valid.map(r => r.ret));
  const alphas = arr(valid.map(r => r.alpha));

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const median = (xs: number[]) => {
    if (!xs.length) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const best = rets.length ? Math.max(...rets) : 0;
  const worst = rets.length ? Math.min(...rets) : 0;
  const winRate = rets.length ? rets.filter(r => r > 0).length / rets.length : 0;
  const beatsSpyRate = alphas.length ? alphas.filter(a => a > 0).length / alphas.length : 0;

  return {
    avgReturn: avg(rets),
    medianReturn: median(rets),
    winRate,
    best,
    worst,
    avgAlpha: avg(alphas),
    medianAlpha: median(alphas),
    beatsSpyRate,
    sampleSize: rets.length,
  };
}
