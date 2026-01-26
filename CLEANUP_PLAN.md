# Aggressive Codebase Cleanup Plan

## Section 1: Files/Folders to Delete

### FastAPI / Python (Entire FastAPI Server)
- `server/main.py` - FastAPI market data server
- `server/requirements.txt` - Python dependencies
- `server/runtime.txt` - Python version
- `render.yaml` - Render deployment config for FastAPI

### Simulation / Mock Servers (Entire Folder)
- `simulation/` - **DELETE ENTIRE FOLDER**
  - `simulation/analysisServer.js`
  - `simulation/twitterServer.js`
  - `simulation/marketServer.js`
  - `simulation/profileServer.js`
  - `simulation/twitterScraper.js`
  - `simulation/extract.js`
  - `simulation/extractReal.js`
  - `simulation/normalize.js`
  - `simulation/normalizeReal.js`
  - `simulation/load.js`
  - `simulation/cacheManager.js`
  - `simulation/checkDatabase.js`
  - `simulation/debug-db.js`
  - `simulation/smartFetch.js`
  - `simulation/tweetCache.js`
  - `simulation/README.md`

### Twitter API Clients
- `api/twitterClient.ts` - Twitter API wrapper
- `api/analyze.js` - Old serverless analyze endpoint (duplicate)
- `api/prefilter.ts` - Tweet filtering logic

### Market Data Clients
- `lib/marketClient.ts` - EODHD market data client
- `lib/pipeline/pricing.ts` - Price calculation pipeline
- `scripts/test-prices.ts` - Market data test script

### Sentiment Analysis
- `utils/sentimentAnalysis.js` - Sentiment analysis utility
- All sentiment logic in `simulation/analysisServer.js` (deleted above)

### Old Analysis Services (Replaced by External API)
- `services/fintwitService.js` - Old analysis service
- `services/incrementalAnalysis.js` - Incremental analysis logic
- `services/asyncSearch.js` - Async search logic
- `services/handleSearch.ts` - Handle search service
- `services/analysisCache.js` - Analysis caching
- `services/analysisApiService.js` - Old API service (replaced by stockAnalysisApiClient.js)
- `services/profileCache.js` - Profile caching (uses MARKET_BASE_URL)
- `services/profile.js` - Profile fetching (uses MARKET_BASE_URL)
- `services/favorites.js` - May use old analysis (check if used)

### Provider Services (Old Data Providers)
- `services/providers/` - **DELETE ENTIRE FOLDER**
  - `services/providers/mockProvider.js`
  - `services/providers/realProvider.js`
  - `services/providers/tweetProvider.js`

### Dummy/Mock Data Services
- `services/dummyAnalysisService.js` - Dummy analysis (no longer needed)
- `utils/mockApi.js` - Mock API utility

### Search Jobs (Not Needed - Analyst API Handles Everything)
- `server/api/search/` - **DELETE ENTIRE FOLDER**
  - `server/api/search/start.js`
  - `server/api/search/status.js`
  - `server/api/search/process.js`

### Documentation (Outdated)
- `BACKEND_API_OVERVIEW.md` - Documents old architecture
- `API_INTEGRATION_GUIDE.md` - Old integration guide
- `DUMMY_DATA_MIGRATION.md` - Migration doc (no longer relevant)
- `REAL_PROVIDER_README.md` - Old provider docs
- `DATA_LAYER.md` - Old data layer docs (if it references deleted code)

### Package.json Scripts to Remove
- `"api:dev"` - FastAPI server
- `"dev:api"` - FastAPI server
- `"dev:analysis"` - Analysis server
- `"dev:all"` - Includes deleted servers
- `"sim:extract"` - Simulation scripts
- `"sim:extract:real"` - Simulation scripts
- `"sim:load"` - Simulation scripts
- `"sim:all"` - Simulation scripts
- `"sim:all:real"` - Simulation scripts
- `"test:prices"` - Market data test
- `"prices:test"` - Market data test

### Dependencies to Remove (from package.json)
- `"@anthropic-ai/sdk"` - Claude/Anthropic (sentiment analysis)
- `"@google/generative-ai"` - Google AI (sentiment analysis)
- `"axios"` - If only used for deleted services
- `"bottleneck"` - Rate limiting (used in deleted services)
- `"csv-parse"` - If only used in simulation

---

## Section 2: Files/Folders to Keep

### Express Server Core
- `server/index.js` - Main Express server (KEEP, but remove search/process route)

### Stripe / Billing (All Keep)
- `server/api/checkout/create.js` - Stripe checkout
- `server/api/billing/portal.js` - Billing portal
- `server/api/billing/invoices.js` - Invoice listing
- `server/api/stripe/webhook.js` - Stripe webhooks
- `server/lib/stripePlans.js` - Stripe plan config
- `services/checkout.js` - Checkout service (if used by frontend)
- `services/entitlements.js` - Entitlements service

### New Analysis Endpoint (Rewrite as Thin Proxy)
- `server/api/analyze.js` - **KEEP BUT REWRITE** as thin proxy to external analyst API

### Stock Analysis API Client (Keep but Simplify)
- `services/stockAnalysisApiClient.js` - Client for external analyst API (may need simplification)

### Environment Config
- `lib/appEnv.ts` - **KEEP BUT CLEAN** - Remove MARKET_BASE_URL, ANALYSIS_BASE_URL, keep only STOCK_ANALYSIS_API_URL

### Frontend Services (Keep)
- `services/checkout.js` - If used by frontend
- `services/entitlements.js` - If used by frontend

### Utils (Keep if Used)
- `utils/` - Keep other utilities not related to deleted services

---

## Section 3: What /api/analyze Should Do (Plain English)

**Current State:** `server/api/analyze.js` is a placeholder that tries to fetch from Twitter API.

**Target State:** Thin proxy that:

1. **Accepts POST request** with:
   - `handle` (string, required) - Twitter handle
   - `months` (number, optional, default: 12) - Analysis period

2. **Validates input:**
   - Check handle is present and valid format
   - Check months is a number between 1-24 (or reasonable range)
   - Return 400 if invalid

3. **Optional: Check authentication** (if you want to require auth):
   - Verify user is authenticated (check session/token)
   - Return 401 if not authenticated

4. **Forward to external analyst API:**
   - Get analyst API URL from environment: `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL`
   - Make GET request to: `${ANALYST_API_URL}/query?handle=${handle}&months=${months}`
   - Pass through any auth headers if needed (API key, etc.)
   - Set reasonable timeout (e.g., 60 seconds)

5. **Handle errors:**
   - If analyst API returns error, forward status code and error message
   - If timeout, return 504 Gateway Timeout
   - If network error, return 502 Bad Gateway

6. **Normalize response** (if needed):
   - Ensure response matches expected format
   - Map field names if analyst API uses different names
   - Add any required metadata

7. **Return response:**
   - Return analyst API response directly (or normalized version)
   - Set appropriate Content-Type header
   - Return 200 on success

**That's it.** No Twitter fetching, no sentiment analysis, no market data, no caching, no background jobs.

---

## Section 4: Env Vars to Remove vs Keep

### Remove (No Longer Needed)

**Twitter API:**
- `TWITTER_API_KEY` - No longer fetching Twitter
- `TW_BEARER` - Alias for Twitter API key

**Market Data:**
- `EODHD_API_TOKEN` - No longer fetching market data
- `MARKET_BASE_URL` - No longer using market API
- `EXPO_PUBLIC_MARKET_BASE_URL` - No longer using market API

**Analysis:**
- `ANALYSIS_BASE_URL` - Old analysis server
- `ANALYSIS_API_URL` - Old analysis API
- `EXPO_PUBLIC_ANALYSIS_API_URL` - Old analysis API
- `ANALYSIS_PORT` - Old analysis server port

**Sentiment Analysis:**
- `DEEPSEEK_API_KEY` - No longer doing sentiment analysis
- `GOOGLE_AI_API_KEY` - If used for sentiment
- `ANTHROPIC_API_KEY` - If used for sentiment

**Simulation:**
- `EXPO_PUBLIC_COMPANY_TICKERS_URL` - If only used in simulation

### Keep (Still Needed)

**Stripe:**
- `STRIPE_SECRET_KEY` - Required for Stripe
- `STRIPE_WEBHOOK_SECRET` - Required for webhooks

**Supabase:**
- `EXPO_PUBLIC_SUPABASE_URL` - Required for database
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Required for client
- `SUPABASE_SERVICE_ROLE_KEY` - Required for server operations

**Analyst API:**
- `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL` - **NEW** - URL for external analyst API
- `STOCK_ANALYSIS_API_TOKEN` or `STOCK_ANALYSIS_API_KEY` - **NEW** - Auth for analyst API (if needed)

**App:**
- `EXPO_PUBLIC_APP_URL` - App URL for redirects
- `PORT` - Express server port (default: 3000)

**Other:**
- Any other env vars used by frontend or Stripe that aren't listed above

---

## Implementation Order

1. **Delete all files/folders** listed in Section 1
2. **Update package.json** - Remove scripts and dependencies
3. **Rewrite `server/api/analyze.js`** as thin proxy (Section 3)
4. **Update `server/index.js`** - Remove search/process route
5. **Clean `lib/appEnv.ts`** - Remove deleted env vars
6. **Update `.env.example`** - Remove deleted env vars, add analyst API vars
7. **Test** - Verify Stripe still works, verify /api/analyze works as proxy

---

## Notes

- **Don't refactor** - Just delete and simplify
- **Don't add abstractions** - Keep it simple and direct
- **Prefer deletion** - If unsure, delete it
- **Test incrementally** - Delete, test, repeat
