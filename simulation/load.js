/**
 * load.js - Aggregate recommendations and upsert to Supabase
 * Reads normalized_recommendations.jsonl, fetches REAL market data from FastAPI, uploads to DB
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const INPUT_NORMALIZED = path.join(__dirname, '../out/normalized_recommendations.jsonl');
const HANDLE = 'abc'; // Simulation handle
const API_BASE = process.env.MARKET_BASE_URL || 'https://alphahandle-api2.onrender.com';

// Initialize Supabase client
// Try multiple env variable formats
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ||
                     process.env.SUPABASE_URL ||
                     'https://vjapeusemdciohsvnelx.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                     process.env.SUPABASE_ANON_KEY ||
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqYXBldXNlbWRjaW9oc3ZuZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDI4OTgsImV4cCI6MjA3NDkxODg5OH0.3p1cgqkSarLjj5Isb4fJ5lylMeVE618JUqG6hXdESgU';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Load] ❌ Error: Supabase credentials not found in environment');
  process.exit(1);
}

console.log('[Load] Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch real market data from FastAPI backend
 */
async function fetchMarketData(recommendations) {
  console.log('[Load] Fetching real market data from FastAPI...');

  // Build batch request for all tickers (entry + latest prices + SPY benchmark)
  const requests = [];

  for (const rec of recommendations) {
    // Entry price: OPEN on next trading day after tweet
    requests.push({
      symbol: rec.ticker,
      type: 'entry',
      tweetTimestamp: rec.mentioned_at
    });

    // Latest price: CLOSE on previous trading day
    requests.push({
      symbol: rec.ticker,
      type: 'latest'
    });
  }

  // Add SPY benchmark for each recommendation (for alpha calculation)
  for (const rec of recommendations) {
    requests.push({
      symbol: 'SPY',
      type: 'entry',
      tweetTimestamp: rec.mentioned_at
    });
  }
  requests.push({ symbol: 'SPY', type: 'latest' });

  console.log(`[Load] Requesting prices for ${requests.length} data points...`);

  try {
    const response = await fetch(`${API_BASE}/api/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[Load] ✅ Received ${result.data.length} prices, ${result.errors.length} errors`);

    if (result.errors.length > 0) {
      console.warn('[Load] ⚠️  Some prices failed to fetch:');
      result.errors.slice(0, 3).forEach(err => {
        console.warn(`  - ${err.symbol} (${err.type}): ${err.message}`);
      });
    }

    return result;
  } catch (error) {
    console.error('[Load] ❌ Failed to fetch market data:', error.message);
    throw error;
  }
}

/**
 * Index market data by symbol+type for quick lookup
 */
function indexMarketData(marketData) {
  const index = new Map();

  for (const item of marketData.data) {
    const key = `${item.symbol.toUpperCase()}|${item.type}|${item.date || 'null'}`;
    index.set(key, item);
  }

  return index;
}

/**
 * Aggregate recommendations with REAL market data
 */
async function aggregateRecommendations(recommendations) {
  // Fetch real market data
  const marketData = await fetchMarketData(recommendations);
  const priceIndex = indexMarketData(marketData);

  // Get SPY latest for benchmark
  const spyLatestKey = `SPY|latest|null`;
  const spyLatest = priceIndex.get(spyLatestKey);

  // Group by ticker
  const byTicker = {};
  for (const rec of recommendations) {
    if (!byTicker[rec.ticker]) {
      byTicker[rec.ticker] = [];
    }
    byTicker[rec.ticker].push(rec);
  }

  // Calculate returns for each ticker
  const trades = [];

  for (const [ticker, recs] of Object.entries(byTicker)) {
    const firstMention = recs[0];
    const mentionDate = firstMention.mentioned_at.split('T')[0];

    // Lookup entry and latest prices
    const entryKey = `${ticker.toUpperCase()}|entry|${mentionDate}`;
    const latestKey = `${ticker.toUpperCase()}|latest|null`;

    const entryData = priceIndex.get(entryKey);
    const latestData = priceIndex.get(latestKey);

    // Lookup SPY entry for this same date (for alpha calculation)
    const spyEntryKey = `SPY|entry|${mentionDate}`;
    const spyEntry = priceIndex.get(spyEntryKey);

    if (!entryData || !latestData || !spyEntry || !spyLatest) {
      console.warn(`[Load] ⚠️  Missing price data for ${ticker}, skipping...`);
      continue;
    }

    const beginningValue = entryData.price;
    const lastValue = latestData.price;
    const stockReturn = ((lastValue - beginningValue) / beginningValue) * 100;

    // Calculate SPY return for same period
    const spyBegin = spyEntry.price;
    const spyEnd = spyLatest.price;
    const spyReturn = ((spyEnd - spyBegin) / spyBegin) * 100;

    // Alpha = stock return - SPY return
    const alphaVsSPY = stockReturn - spyReturn;

    const trade = {
      ticker: `$${ticker}`,
      company: `${ticker} Inc.`,
      dateMentioned: mentionDate,
      beginningValue: Math.round(beginningValue * 100) / 100,
      lastValue: Math.round(lastValue * 100) / 100,
      dividends: 0,
      adjLastValue: Math.round(lastValue * 100) / 100,
      stockReturn: Math.round(stockReturn * 10) / 10,
      alphaVsSPY: Math.round(alphaVsSPY * 10) / 10,
      hitOrMiss: stockReturn > 0 ? 'Hit' : 'Miss',
      tweetUrl: `https://x.com/${HANDLE}/status/${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      asofEntry: entryData.asof,
      asofLatest: latestData.asof
    };

    trades.push(trade);
  }

  if (trades.length === 0) {
    throw new Error('No trades with valid market data. Check API connectivity.');
  }

  console.log(`[Load] ✅ Processed ${trades.length} trades with real market data`);

  // Calculate aggregate metrics
  const totalCalls = trades.length;
  const returns = trades.map(t => t.stockReturn);

  const avgReturn = Math.round((returns.reduce((sum, r) => sum + r, 0) / totalCalls) * 10) / 10;
  const alphas = trades.map(t => t.alphaVsSPY);
  const alpha = Math.round((alphas.reduce((sum, a) => sum + a, 0) / totalCalls) * 10) / 10;

  const wins = trades.filter(t => t.stockReturn > 0).length;
  const winRate = Math.round((wins / totalCalls) * 100 * 10) / 10;
  const hitRatio = winRate;

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

  return {
    handle: HANDLE,
    avg_return: avgReturn,
    accuracy: hitRatio,
    total_calls: totalCalls,
    win_rate: winRate,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    last_updated: new Date().toISOString(),
    recent_recommendations: trades,
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
  console.log('[Load] ===============================================');
  console.log('[Load] Loading simulation with REAL market data');
  console.log('[Load] API Base:', API_BASE);
  console.log('[Load] ===============================================\n');

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
  console.log(`[Load] Found ${recommendations.length} recommendations\n`);

  // Aggregate with real market data
  console.log('[Load] Aggregating metrics with real market data...');
  const analysis = await aggregateRecommendations(recommendations);

  // Upsert to Supabase
  await upsertAnalysis(analysis);

  console.log('\n[Load] ✅ Complete! Analysis with REAL market data loaded into Supabase.');
  console.log(`[Load] Search for handle "@${HANDLE}" in the Portal to see live financial data!`);
}

// Run load pipeline
main().catch(err => {
  console.error('[Load] ❌ Error:', err);
  process.exit(1);
});
