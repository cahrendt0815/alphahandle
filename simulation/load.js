/**
 * load.js - Aggregate recommendations and upsert to Supabase
 * Reads normalized_recommendations.jsonl, calculates metrics, uploads to DB
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const INPUT_NORMALIZED = path.join(__dirname, '../out/normalized_recommendations.jsonl');
const HANDLE = 'abc'; // Simulation handle

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Load] ❌ Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Simulate stock returns for a ticker (for testing)
 * In production, this would fetch real market data
 */
function simulateReturns(ticker, entryPrice, mentionedDate) {
  // Generate random returns for simulation
  // Positive bias for "long", negative bias for "short"
  const randomReturn = (Math.random() - 0.3) * 30; // -9% to +21%

  const currentPrice = entryPrice ? entryPrice * (1 + randomReturn / 100) : null;
  const percentReturn = randomReturn;

  return {
    current_price: currentPrice,
    percent_return: percentReturn,
    dollar_return: entryPrice ? (currentPrice - entryPrice) : null,
  };
}

/**
 * Aggregate recommendations into analysis metrics
 * Matches the exact format expected by the app (from mockProvider.js)
 */
function aggregateRecommendations(recommendations) {
  // Group by ticker
  const byTicker = {};

  for (const rec of recommendations) {
    if (!byTicker[rec.ticker]) {
      byTicker[rec.ticker] = [];
    }
    byTicker[rec.ticker].push(rec);
  }

  // Calculate returns for each ticker (create recentTrades array)
  const trades = [];
  for (const [ticker, recs] of Object.entries(byTicker)) {
    // Use first mention for this ticker
    const firstMention = recs[0];

    // Simulate returns
    const returns = simulateReturns(
      ticker,
      firstMention.entry_price,
      firstMention.mentioned_at
    );

    const beginningValue = firstMention.entry_price || 100;
    const lastValue = returns.current_price || beginningValue * (1 + returns.percent_return / 100);
    const stockReturn = returns.percent_return;

    // Calculate alpha (stock return vs SPY benchmark - assume 1.5% SPY return for simulation)
    const spyReturn = 1.5;
    const alphaVsSPY = stockReturn - spyReturn;

    const trade = {
      ticker: `$${ticker}`,  // Add $ prefix
      company: `${ticker} Inc.`,  // Add Inc. suffix
      dateMentioned: firstMention.mentioned_at.split('T')[0],  // Just the date part
      beginningValue: Math.round(beginningValue * 100) / 100,
      lastValue: Math.round(lastValue * 100) / 100,
      dividends: 0,
      adjLastValue: Math.round(lastValue * 100) / 100,
      stockReturn: Math.round(stockReturn * 10) / 10,  // Round to 1 decimal
      alphaVsSPY: Math.round(alphaVsSPY * 10) / 10,
      hitOrMiss: stockReturn > 0 ? 'Hit' : 'Miss',
      tweetUrl: `https://x.com/${HANDLE}/status/${Math.floor(Math.random() * 9000000000 + 1000000000)}`
    };

    trades.push(trade);
  }

  // Calculate aggregate metrics
  const totalCalls = trades.length;
  const returns = trades.map(t => t.stockReturn);

  const avgReturn = Math.round((returns.reduce((sum, r) => sum + r, 0) / totalCalls) * 10) / 10;
  const alphas = trades.map(t => t.alphaVsSPY);
  const alpha = Math.round((alphas.reduce((sum, a) => sum + a, 0) / totalCalls) * 10) / 10;

  const wins = trades.filter(t => t.stockReturn > 0).length;
  const winRate = Math.round((wins / totalCalls) * 100 * 10) / 10;
  const hitRatio = winRate;  // Same as winRate for our simulation

  // Best and worst trades
  const sortedTrades = [...trades].sort((a, b) => b.stockReturn - a.stockReturn);
  const bestTrade = {
    ticker: sortedTrades[0].ticker,
    return: `${sortedTrades[0].stockReturn > 0 ? '+' : ''}${sortedTrades[0].stockReturn}%`,
    date: sortedTrades[0].dateMentioned
  };
  const worstTrade = {
    ticker: sortedTrades[sortedTrades.length - 1].ticker,
    return: `${sortedTrades[sortedTrades.length - 1].stockReturn > 0 ? '+' : ''}${sortedTrades[sortedTrades.length - 1].stockReturn}%`,
    date: sortedTrades[sortedTrades.length - 1].dateMentioned
  };

  // Return analysis in DATABASE format (will be transformed by supabaseClient)
  return {
    handle: HANDLE,
    avg_return: avgReturn,
    accuracy: hitRatio,
    total_calls: totalCalls,
    win_rate: winRate,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    last_updated: new Date().toISOString(),
    recent_recommendations: trades,  // Will be transformed to recentTrades by supabaseClient
  };
}

/**
 * Upsert analysis to Supabase
 */
async function upsertAnalysis(analysis) {
  console.log('[Load] Upserting analysis to Supabase...');
  console.log(`[Load] Handle: @${analysis.handle}`);
  console.log(`[Load] Total calls: ${analysis.total_calls}`);
  console.log(`[Load] Avg return: ${analysis.avg_return}%`);
  console.log(`[Load] Win rate: ${analysis.win_rate}%`);
  console.log(`[Load] Accuracy: ${analysis.accuracy}%`);

  const { data, error } = await supabase
    .from('analyses')
    .upsert(analysis, {
      onConflict: 'handle',
    })
    .select();

  if (error) {
    console.error('[Load] ❌ Supabase error:', error);
    throw error;
  }

  console.log('[Load] ✅ Successfully upserted to Supabase');
  return data;
}

/**
 * Main load pipeline
 */
async function main() {
  console.log('[Load] Reading normalized recommendations:', INPUT_NORMALIZED);

  if (!fs.existsSync(INPUT_NORMALIZED)) {
    console.error('[Load] ❌ Error: normalized_recommendations.jsonl not found.');
    console.error('[Load] Run sim:extract first (which runs extract + normalize).');
    process.exit(1);
  }

  // Read JSONL file
  const lines = fs.readFileSync(INPUT_NORMALIZED, 'utf-8')
    .split('\n')
    .filter(line => line.trim());

  const recommendations = lines.map(line => JSON.parse(line));
  console.log(`[Load] Found ${recommendations.length} recommendations`);

  // Aggregate into analysis metrics
  console.log('[Load] Aggregating metrics...');
  const analysis = aggregateRecommendations(recommendations);

  // Upsert to Supabase
  await upsertAnalysis(analysis);

  console.log('\n[Load] ✅ Complete! Analysis loaded into Supabase.');
  console.log(`[Load] You can now search for handle "@${HANDLE}" in your app!`);
}

// Run load pipeline
main().catch(err => {
  console.error('[Load] ❌ Error:', err);
  process.exit(1);
});
