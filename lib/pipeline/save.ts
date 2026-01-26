// lib/pipeline/save.ts
import { createClient } from '@supabase/supabase-js';

export async function saveAnalysis({
  handle,
  recs,
  summary
}: {
  handle: string;
  recs: any[];
  summary: any;
}) {
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  );

  const payload = {
    handle,
    computed_metrics: summary,              // avgReturn, avgAlpha, winRate, etc.
    recommendations_with_prices: recs,      // entry/latest, ret, alpha, asof dates
    last_updated: new Date().toISOString()
  };

  // upsert by handle (make sure you have a unique index on handle if using on_conflict)
  const { error } = await supabase
    .from('analyses')
    .upsert(payload, { onConflict: 'handle' });

  if (error) throw error;
  return payload;
}
