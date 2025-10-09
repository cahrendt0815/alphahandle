// lib/metrics.ts
export function computeReturn(stance: 'long'|'short', entry: number, latest: number) {
  if (!isFinite(entry) || !isFinite(latest) || entry <= 0 || latest <= 0) return null;
  return stance === 'long' ? (latest / entry) - 1 : (entry / latest) - 1;
}

export function computeAlpha(ret: number|null, spyRet: number|null) {
  if (ret == null || spyRet == null) return null;
  return ret - spyRet;
}

export function median(nums: number[]) {
  const a = nums.slice().sort((x,y)=>x-y);
  const n = a.length; if (!n) return null;
  return n % 2 ? a[(n-1)/2] : (a[n/2-1] + a[n/2]) / 2;
}

export function summarize(list: Array<{ret: number|null, alpha: number|null}>) {
  const rets = list.map(x=>x.ret).filter((x): x is number => x!=null);
  const alphas = list.map(x=>x.alpha).filter((x): x is number => x!=null);

  const avg = (arr: number[]) => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : null;
  const winRate = rets.length ? rets.filter(r => r>0).length / rets.length : null;
  const beatsSpy = alphas.length ? alphas.filter(a => a>0).length / alphas.length : null;

  return {
    sampleSize: list.length,
    avgReturn: avg(rets),
    medianReturn: median(rets),
    winRate,
    best: rets.length ? Math.max(...rets) : null,
    worst: rets.length ? Math.min(...rets) : null,
    avgAlpha: avg(alphas),
    medianAlpha: median(alphas),
    beatsSpyRate: beatsSpy
  };
}
