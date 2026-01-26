/**
 * Node.js Market API Server
 * Provides stock price data via EODHD API
 * Alternative to the Python FastAPI server
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 8000;

// EODHD API Configuration
const EODHD_API_TOKEN = process.env.EODHD_API_TOKEN || '68e8d3117def78.19109345';
const EODHD_BASE_URL = 'https://eodhd.com/api';

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:19006'
  ],
  credentials: true
}));

app.use(express.json());

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
 * Get entry price (OPEN price for next trading day after tweet)
 */
async function getEntryPrice(symbol, tweetTimestamp) {
  try {
    const tweetDate = new Date(tweetTimestamp);
    const startDate = tweetDate.toISOString().split('T')[0];

    // Request 10 days of data to find next trading day
    const endDate = new Date(tweetDate);
    endDate.setDate(endDate.getDate() + 10);
    const endDateStr = endDate.toISOString().split('T')[0];

    const normalizedSymbol = normalizeSymbol(symbol);
    const url = `${EODHD_BASE_URL}/eod/${normalizedSymbol}`;
    const params = {
      api_token: EODHD_API_TOKEN,
      from: startDate,
      to: endDateStr,
      fmt: 'json'
    };

    console.log(`[Market] Fetching entry price for ${symbol} from ${startDate}`);

    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[Market] No data found for ${symbol}`);
      return { price: null, asof: null };
    }

    // Find first trading day after tweet
    for (const row of data) {
      const tradeDate = new Date(row.date);
      if (tradeDate > tweetDate) {
        console.log(`[Market] Found entry price for ${symbol}: $${row.open} on ${row.date}`);
        return {
          price: parseFloat(row.open),
          asof: row.date
        };
      }
    }

    console.log(`[Market] No trading day found after ${startDate} for ${symbol}`);
    return { price: null, asof: null };

  } catch (error) {
    console.error(`[Market] Error fetching entry price for ${symbol}:`, error.message);
    return { price: null, asof: null };
  }
}

/**
 * Get latest real-time price
 */
async function getLatestPrice(symbol) {
  try {
    const normalizedSymbol = normalizeSymbol(symbol);
    const url = `${EODHD_BASE_URL}/real-time/${normalizedSymbol}`;
    const params = {
      api_token: EODHD_API_TOKEN,
      fmt: 'json'
    };

    console.log(`[Market] Fetching latest price for ${symbol}`);

    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;

    if (!data || !data.close) {
      console.log(`[Market] No latest price found for ${symbol}`);
      return { price: null, asof: null };
    }

    const price = parseFloat(data.close);
    const asof = data.timestamp
      ? new Date(data.timestamp * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    console.log(`[Market] Found latest price for ${symbol}: $${price} as of ${asof}`);
    return { price, asof };

  } catch (error) {
    console.error(`[Market] Error fetching latest price for ${symbol}:`, error.message);
    return { price: null, asof: null };
  }
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: 'eodhd',
    api_configured: !!EODHD_API_TOKEN
  });
});

/**
 * Batch quotes endpoint
 */
app.post('/api/quotes/batch', async (req, res) => {
  const { requests } = req.body;

  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: 'requests must be an array' });
  }

  console.log(`[Market] Processing batch request for ${requests.length} symbols`);

  const results = [];
  const errors = [];

  for (const request of requests) {
    try {
      const { symbol, type, tweetTimestamp } = request;

      if (type === 'entry') {
        if (!tweetTimestamp) {
          errors.push({
            symbol,
            type,
            message: 'tweetTimestamp required for entry price'
          });
          continue;
        }

        const { price, asof } = await getEntryPrice(symbol, tweetTimestamp);

        if (price === null) {
          errors.push({
            symbol,
            type,
            message: 'Could not fetch entry price'
          });
        } else {
          results.push({
            symbol,
            type,
            price,
            asof
          });
        }

      } else if (type === 'latest') {
        const { price, asof } = await getLatestPrice(symbol);

        if (price === null) {
          errors.push({
            symbol,
            type,
            message: 'Could not fetch latest price'
          });
        } else {
          results.push({
            symbol,
            type,
            price,
            asof
          });
        }

      } else {
        errors.push({
          symbol,
          type,
          message: `Unknown type: ${type}`
        });
      }

    } catch (error) {
      errors.push({
        symbol: request.symbol,
        type: request.type,
        message: error.message
      });
    }
  }

  console.log(`[Market] Batch complete: ${results.length} prices fetched, ${errors.length} errors`);

  res.json({
    data: results,
    errors
  });
});

/**
 * Dividends endpoint (stub)
 */
app.get('/api/dividends', (req, res) => {
  res.json([]);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Market API Server running on http://localhost:${PORT}`);
  console.log(`📊 Provider: EODHD`);
  console.log(`🔑 API Token: ${EODHD_API_TOKEN ? 'Configured' : 'MISSING'}\n`);
});