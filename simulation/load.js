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
const EODHD_API_TOKEN = '68e8d3117def78.19109345';
const EODHD_BASE_URL = 'https://eodhd.com/api';

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
 * Normalize symbol to EODHD format (e.g., AAPL -> AAPL.US)
 */
function normalizeSymbol(symbol) {
  symbol = symbol.toUpperCase().trim();
  if (!symbol.includes('.')) {
    symbol = `${symbol}.US`;
  }
  return symbol;
}

/**
 * Fetch entry price from EODHD (OPEN on next trading day after tweet)
 */
async function fetchEntryPrice(symbol, tweetTimestamp) {
  const tweetDate = new Date(tweetTimestamp);
  const startDate = tweetDate.toISOString().split('T')[0];
  const endDate = new Date(tweetDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const normalizedSymbol = normalizeSymbol(symbol);
  const url = `${EODHD_BASE_URL}/eod/${normalizedSymbol}?api_token=${EODHD_API_TOKEN}&from=${startDate}&to=${endDate}&fmt=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { price: null, asof: null };
    }

    // Find first trading day after tweet
    for (const row of data) {
      const tradeDate = new Date(row.date + 'T00:00:00Z');
      if (tradeDate > tweetDate) {
        return {
          price: parseFloat(row.open),
          asof: row.date
        };
      }
    }

    return { price: null, asof: null };
  } catch (error) {
    console.warn(`  Failed to fetch entry price for ${symbol}: ${error.message}`);
    return { price: null, asof: null };
  }
}

/**
 * Fetch latest price from EODHD (real-time API)
 */
async function fetchLatestPrice(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const url = `${EODHD_BASE_URL}/real-time/${normalizedSymbol}?api_token=${EODHD_API_TOKEN}&fmt=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.close) {
      return { price: null, asof: null };
    }

    const price = parseFloat(data.close);
    const asof = data.timestamp
      ? new Date(data.timestamp * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return { price, asof };
  } catch (error) {
    console.warn(`  Failed to fetch latest price for ${symbol}: ${error.message}`);
    return { price: null, asof: null };
  }
}

/**
 * Fetch real market data from EODHD API
 */
async function fetchMarketData(recommendations) {
  console.log('[Load] Fetching real market data from EODHD API...');

  const priceMap = new Map();

  // Fetch entry prices
  for (const rec of recommendations) {
    const { price, asof } = await fetchEntryPrice(rec.ticker, rec.mentioned_at);
    priceMap.set(`${rec.ticker}|entry|${rec.mentioned_at}`, { price, asof });
  }

  // Fetch latest prices (deduplicate by symbol)
  const uniqueSymbols = [...new Set(recommendations.map(r => r.ticker))];
  for (const symbol of uniqueSymbols) {
    const { price, asof } = await fetchLatestPrice(symbol);
    priceMap.set(`${symbol}|latest`, { price, asof });
  }

  // Fetch SPY benchmark
  const spyEntryPrices = new Map();
  for (const rec of recommendations) {
    if (!spyEntryPrices.has(rec.mentioned_at)) {
      const { price, asof } = await fetchEntryPrice('SPY', rec.mentioned_at);
      spyEntryPrices.set(rec.mentioned_at, { price, asof });
      priceMap.set(`SPY|entry|${rec.mentioned_at}`, { price, asof });
    }
  }

  const spyLatest = await fetchLatestPrice('SPY');
  priceMap.set('SPY|latest', spyLatest);

  console.log(`[Load] ✅ Fetched prices for ${priceMap.size} data points`);

  return priceMap;
}

/**
 * Aggregate recommendations with REAL market data
 */
async function aggregateRecommendations(recommendations) {
  // Fetch real market data (returns Map)
  const priceMap = await fetchMarketData(recommendations);

  // Get SPY latest for benchmark
  const spyLatest = priceMap.get('SPY|latest');

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

    // Lookup entry and latest prices
    const entryKey = `${ticker}|entry|${firstMention.mentioned_at}`;
    const latestKey = `${ticker}|latest`;

    const entryData = priceMap.get(entryKey);
    const latestData = priceMap.get(latestKey);

    // Lookup SPY entry for this same date (for alpha calculation)
    const spyEntryKey = `SPY|entry|${firstMention.mentioned_at}`;
    const spyEntry = priceMap.get(spyEntryKey);

    if (!entryData || !latestData || !spyEntry || !spyLatest ||
        entryData.price === null || latestData.price === null ||
        spyEntry.price === null || spyLatest.price === null) {
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
      dateMentioned: firstMention.mentioned_at.split('T')[0],
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
