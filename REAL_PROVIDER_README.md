# Real Provider Implementation Guide

This document explains how the real data provider system works and how to configure it for production use.

## Architecture Overview

The application uses a **provider pattern** to abstract data sources:

```
[UI Layer]
    ↓
[Service Layer: fintwitService.js]
    ↓
[Provider Layer: mockProvider.js OR realProvider.js]
    ↓
[Data Source: Mock Data OR Serverless API → Twitter/Yahoo Finance]
```

## Components

### 1. Helper Utilities (`utils/analysisHelpers.js`)

Core functions for analyzing Twitter content:

- **`extractTickers(text)`** - Extracts stock tickers ($AAPL format) from tweet text
- **`inferTradeIntent(text)`** - Determines trade type (Buy/Sell/Hold) and direction (Long/Short) using keyword matching
- **`isSpamTweet(tickers)`** - Filters out tweets with too many tickers (likely spam)
- **`calculateReturn(entryPrice, exitPrice)`** - Calculates percentage return
- **`determineHitOrMiss(alpha)`** - Determines if trade beat benchmark (S&P 500)

**Edge cases handled:**
- Filters currency symbols ($USD, $EUR) and common abbreviations ($CEO, $IPO)
- Weekend/holiday handling for trading days
- Validates ticker length (1-5 characters)

### 2. Serverless API (`api/analyze.js`)

Vercel/Netlify-compatible serverless function that:

- Accepts `GET /api/analyze?handle=@username&limit=100&since=2025-01-01`
- Fetches tweets from Twitter API (when configured)
- Extracts tickers and trade intent
- Fetches historical prices from Yahoo Finance
- Calculates returns and alpha vs S&P 500
- Returns `AnalysisResult` JSON structure

**Current status:** Returns 503 error with `requiresSetup: true` until Twitter API credentials are configured.

**Yahoo Finance integration:**
- Uses `yahoo-finance2` npm package (no API key required)
- Caches price data (5-minute TTL) to reduce API calls
- Handles market closures and weekends

### 3. Real Provider (`services/providers/realProvider.js`)

Client-side service that:

- Calls serverless API endpoint
- Includes 30-second timeout with abort controller
- Validates and normalizes API response
- Handles errors with detailed error codes:
  - `API_NOT_CONFIGURED` - Twitter API not set up
  - `TIMEOUT` - Request exceeded 30 seconds
  - `NETWORK_ERROR` - Unable to reach API

### 4. Service Layer (`services/fintwitService.js`)

Main orchestration layer:

- Checks `EXPO_PUBLIC_USE_MOCK` environment variable
- Routes to mock or real provider
- **Graceful fallback**: If real provider fails, automatically falls back to mock data
- Tags results with `dataSource: 'mock' | 'real' | 'mock-fallback'`

## Configuration

### Development (Mock Data)

Default configuration - no setup required:

```bash
# .env
EXPO_PUBLIC_USE_MOCK=true
```

### Local Development (Real API Testing)

1. Install dependencies:
```bash
cd fintwit-performance
npm install yahoo-finance2
```

2. Set environment:
```bash
# .env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=http://localhost:3000
```

3. Run serverless function locally (requires Vercel CLI):
```bash
npm install -g vercel
vercel dev
```

4. **TODO:** Add Twitter API credentials (see Production Setup)

### Production Deployment

#### Step 1: Deploy Serverless Functions

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Step 2: Configure Environment Variables

In your serverless platform dashboard (Vercel/Netlify):

**Server environment (DO NOT expose to client):**
```
TWITTER_API_KEY=your_twitter_api_key_from_twitterapi_io
```

**Client environment (.env):**
```bash
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=https://your-vercel-app.vercel.app
```

#### Step 3: Get Twitter API Access

Options:
1. **twitterapi.io** (recommended for quick start)
   - Sign up at https://twitterapi.io
   - Get API key
   - Supports user timeline, search, and quote lookups

2. **Twitter Developer Platform** (official, free tier available)
   - Apply at https://developer.twitter.com
   - Requires app approval
   - Better rate limits for approved apps

3. **RapidAPI Twitter alternatives**
   - Various third-party APIs available

**Note:** The serverless function API is designed to work with any Twitter API that provides:
- User timeline/tweets endpoint
- Tweet metadata (id, text, created_at, permalink)

## Data Flow Example

1. **User enters:** `@elonmusk`
2. **Service layer** checks `EXPO_PUBLIC_USE_MOCK`
3. **Real provider** calls `https://your-app.vercel.app/api/analyze?handle=@elonmusk&limit=100`
4. **Serverless function:**
   - Fetches last 100 tweets from Twitter API
   - Extracts tickers: `$TSLA`, `$DOGE`, etc.
   - For each ticker:
     - Infers intent (Buy/Sell/Hold)
     - Gets entry price (next market close after tweet)
     - Gets current price
     - Calculates return and alpha vs S&P 500
   - Aggregates metrics (avg return, hit ratio, etc.)
   - Returns `AnalysisResult`
5. **UI displays** results

## Testing

Run unit tests:
```bash
npm test utils/__tests__/analysisHelpers.test.js
```

Test coverage includes:
- ✅ Ticker extraction with edge cases
- ✅ Trade intent inference (bullish/bearish keywords)
- ✅ Spam detection
- ✅ Date formatting and trading day calculations
- ✅ Return calculations

## Limitations & Future Improvements

### Current Limitations

1. **No Twitter API integration yet** - Serverless function returns 503 until configured
2. **No caching layer** - Each request fetches fresh data (add Redis/DB later)
3. **Basic NLP** - Keyword matching only (consider sentiment analysis APIs)
4. **No authentication** - API is publicly accessible (add rate limiting)
5. **Limited error recovery** - Falls back to mock data on any error

### Planned Improvements

- [ ] Implement Twitter API integration with multiple provider support
- [ ] Add Redis caching layer (1-hour TTL for analysis results)
- [ ] Implement rate limiting (per IP or API key)
- [ ] Add sentiment analysis using OpenAI/Anthropic API
- [ ] Support for timeframe filtering (last 3/6/12/24 months)
- [ ] Database persistence for historical analysis
- [ ] Webhooks for real-time tweet monitoring
- [ ] Batch processing for multiple handles
- [ ] Advanced ML models for trade intent classification

## Troubleshooting

**Issue:** "Twitter API not configured" error

**Solution:** Set `TWITTER_API_KEY` environment variable in serverless platform

---

**Issue:** "Request timeout after 30000ms"

**Solution:** Twitter API or Yahoo Finance may be slow. Check:
- Twitter API rate limits
- Network connectivity
- Increase timeout in `realProvider.js` if needed

---

**Issue:** "Network error - unable to reach API"

**Solution:**
- Check `EXPO_PUBLIC_API_BASE` is correct
- Verify serverless function is deployed
- Check CORS headers in `api/analyze.js`

---

**Issue:** Falls back to mock data unexpectedly

**Solution:** Check console logs for real provider error details:
```javascript
console.log('[realProvider] Error:', error.message);
```

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit `.env` to git** - Use `.env.example` as template
2. **Never expose server secrets to client** - Twitter API key should only be in serverless environment
3. **Implement rate limiting** - Prevent API abuse
4. **Validate all inputs** - Sanitize handle parameter before API calls
5. **Use HTTPS only** - No HTTP in production

## Support & Contribution

For questions or issues:
- Check console logs for detailed error messages
- Review unit tests for usage examples
- See `types/analysis.js` for data structure definitions
