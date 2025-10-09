# Fintwit Performance Data Layer

This document explains the clean data layer architecture that abstracts data providers for the Fintwit Performance app.

## Architecture Overview

The data layer uses a **provider pattern** to allow seamless switching between mock data (for development) and real Twitter/X data (for production) without changing UI code.

```
┌─────────────────┐
│   UI Screens    │ (HomeScreen, ResultsScreen)
└────────┬────────┘
         │ calls analyzeHandle(handle)
         ▼
┌─────────────────┐
│ fintwitService  │ (Main service layer)
└────────┬────────┘
         │ routes to:
         ├─────────────────┐
         ▼                 ▼
┌────────────────┐  ┌────────────────┐
│ mockProvider   │  │ realProvider   │
│ (local data)   │  │ (API via proxy)│
└────────────────┘  └────────┬───────┘
                             │ fetches from:
                             ▼
                    ┌────────────────┐
                    │ serverless API │
                    │ /api/analyze   │
                    └────────────────┘
```

## File Structure

```
fintwit-performance/
├── types/
│   └── analysis.js              # JSDoc type definitions
├── services/
│   ├── fintwitService.js        # Main service (routes to providers)
│   └── providers/
│       ├── mockProvider.js      # Mock data provider
│       └── realProvider.js      # Real API provider
├── server/
│   └── api/
│       └── analyze.js           # Serverless proxy (Vercel/Netlify)
├── .env                         # Environment config (local)
├── .env.example                 # Environment config template
└── DATA_LAYER.md                # This file
```

## Usage

### In UI Code

Import and call `analyzeHandle()` from the service layer:

```javascript
import { analyzeHandle } from '../services/fintwitService';

// In ResultsScreen or any component:
useEffect(() => {
  analyzeHandle(handle).then((data) => {
    setData(data);
  }).catch((error) => {
    console.error('Error:', error);
  });
}, [handle]);
```

### Environment Configuration

Create a `.env` file (copy from `.env.example`):

```bash
# Use mock data (default)
EXPO_PUBLIC_USE_MOCK=true

# Or use real data
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=https://your-vercel-app.vercel.app
```

The service automatically chooses the correct provider based on `EXPO_PUBLIC_USE_MOCK`.

## Data Types

All data follows the `AnalysisResult` type defined in `types/analysis.js`:

```javascript
{
  handle: string,              // "@elonmusk"
  totalRecommendations: number,
  accuracy: number,            // 0-100
  avgReturn: string,           // "+24.5%"
  winRate: number,             // 0-100
  bestTrade: {
    ticker: string,
    return: string,
    date: string
  },
  worstTrade: { ... },
  lastUpdated: string,
  recentTrades: [
    {
      date: string,            // "2025-01-15"
      company: string,         // "Tesla Inc."
      ticker: string,          // "TSLA"
      type: string,            // "Buy" | "Sell" | "Hold"
      direction: string,       // "Long" | "Short"
      entryPrice: number,
      exitPrice: number | null,
      returnPct: number,
      outcome: string,         // "Win" | "Loss"
      benchmarkPct: number,    // S&P 500 return
      tweetUrl: string
    }
  ]
}
```

## Providers

### Mock Provider (`services/providers/mockProvider.js`)

- Returns realistic fake data
- No API calls
- 2-second simulated delay
- Perfect for development and testing

### Real Provider (`services/providers/realProvider.js`)

- Fetches from serverless API endpoint
- Includes error handling and fallback to mock
- API key stays secure on server

## Serverless API (`server/api/analyze.js`)

Deploys as a serverless function (Vercel/Netlify/AWS Lambda).

**Environment variables (set in deployment platform):**
```bash
TWITTER_API_KEY=your_twitter_api_key_here
```

**Endpoint:**
```
GET /api/analyze?handle=elonmusk
```

**TODO Items in serverless function:**
1. Replace placeholder URL with actual twitterapi.io endpoint
2. Implement tweet parsing logic to extract $TICKER mentions
3. Infer trade type (Buy/Sell/Hold) from tweet text
4. Fetch historical prices for entry/exit calculation
5. Calculate benchmark (S&P 500) returns
6. Map API response to `AnalysisResult` format

## Switching Between Mock and Real Data

### Development (Mock)
```bash
# In .env
EXPO_PUBLIC_USE_MOCK=true
```

### Production (Real)
```bash
# In .env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=https://your-vercel-app.vercel.app
```

### Testing Fallback
The service automatically falls back to mock data if the real API fails, with a console warning.

## Deployment

### 1. Deploy Serverless Function

**Vercel:**
```bash
cd server
vercel deploy
```

Set environment variable:
```bash
vercel env add TWITTER_API_KEY
```

**Netlify:**
```bash
netlify deploy --prod
```

### 2. Update Expo App

```bash
# In .env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=https://your-vercel-app.vercel.app
```

### 3. Build and Deploy Expo App

```bash
eas build --platform all
```

## Benefits

✅ **Clean separation of concerns** - UI doesn't know about data sources
✅ **Easy switching** - Toggle between mock and real with one env var
✅ **Secure** - API keys never exposed to client
✅ **Fallback safety** - Graceful degradation if API fails
✅ **Type-safe** - JSDoc types provide IntelliSense
✅ **Testable** - Mock provider makes testing easy

## Next Steps

1. Implement actual tweet parsing in `server/api/analyze.js`
2. Add stock price lookup API (Alpha Vantage, Yahoo Finance, etc.)
3. Implement S&P 500 benchmark calculation
4. Add caching layer (Redis/Vercel KV) for API responses
5. Add rate limiting and authentication to serverless function
6. Implement webhook support for real-time updates
