# Fintwit Performance

Track and analyze the performance of financial Twitter accounts.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your environment variables:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
MARKET_BASE_URL=http://localhost:8000
```

## Development

### Run the web app:
```bash
npm run web
```

### Run the Express server (Stripe webhooks):
```bash
npm run server
```

### Run the FastAPI market data server:
```bash
npm run api:dev
```

Requires Python 3.11.9 and dependencies from `server/requirements.txt`:
```bash
pip install -r server/requirements.txt
```

### Run full stack (web + server + webhooks):
```bash
npm run dev:full
```

## Market Data API

The FastAPI server provides real-time and historical market data via yfinance.

**Caching enabled** (`requests_cache`):
- Historical entry prices: 30-day TTL
- Latest prices: 6-hour TTL
- In-process LRU cache (512 items) for hot data
- Retry with exponential backoff (4 attempts)

### Configuration

**Local development:**
- Set `MARKET_BASE_URL=http://localhost:8000` in `.env.local`
- Run `npm run api:dev` to start the API server

**Production (Render):**
- Set `MARKET_BASE_URL=https://your-service.onrender.com` in `.env` or as environment variable
- Render will auto-detect Python via `runtime.txt` and install dependencies

### Test the API

```bash
npm run test:prices
```

This will test the `/api/quotes/batch` and `/api/dividends` endpoints.

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/dividends?symbol=AAPL&range=5y` - Get dividend history
- `POST /api/quotes/batch` - Batch fetch entry and latest prices

## Simulation Pipeline

Test the analysis flow with sample tweet data:

```bash
npm run sim:all
```

This runs:
1. `sim:extract` - Extract tickers and stance from CSV
2. `sim:load` - Aggregate and upload to Supabase

## Important Notes

⚠️ **Disclaimer**: Prices are end-of-day data from Yahoo Finance via yfinance. Not investment advice.
