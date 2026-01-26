# Backend API Overview

## Summary

**Yes, you have multiple backend APIs already in place.** The codebase contains:

1. **FastAPI Server (Python)** - Market data API (`server/main.py`)
2. **Express Server (Node.js)** - Stripe webhooks & billing (`server/index.js`)
3. **Serverless Functions** - Various API endpoints (`server/api/`)
4. **Simulation Servers** - Development/testing servers (`simulation/`)

---

## 1. FastAPI Server (Python) - Market Data API

**Location:** `server/main.py`  
**Port:** `8000` (default)  
**Framework:** FastAPI  
**Purpose:** Provides market data (stock prices, dividends, Twitter profiles)

### Endpoints:

- `GET /api/health` - Health check
- `POST /api/quotes/batch` - Batch fetch stock prices (entry & latest)
- `GET /api/dividends?symbol=AAPL&range=5y` - Get dividend history
- `GET /api/profile/{handle}` - Get Twitter profile information

### How to Run:

```bash
npm run api:dev
# or
npm run dev:api
```

This starts the server on `http://localhost:8000`

### Configuration:

- Uses **EODHD API** for market data
- Uses **TwitterAPI.io** for Twitter profiles
- Environment variables: `EODHD_API_TOKEN`, `TWITTER_API_KEY`
- CORS enabled for localhost origins

### Files:

- `server/main.py` - Main FastAPI application
- `server/requirements.txt` - Python dependencies
- `server/runtime.txt` - Python version specification

---

## 2. Express Server (Node.js) - Stripe & Billing

**Location:** `server/index.js`  
**Port:** `3000` (default)  
**Framework:** Express  
**Purpose:** Handles Stripe webhooks, checkout, billing portal, and search jobs

### Endpoints:

- `POST /api/checkout/create` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler
- `POST /api/billing/portal` - Create billing portal session
- `GET /api/billing/invoices` - Get user invoices
- `POST /api/search/process` - Process search job
- `GET /health` - Health check

### How to Run:

```bash
npm run server
```

This starts the server on `http://localhost:3000`

### API Routes Structure:

```
server/
├── index.js                    # Main Express server
├── api/
│   ├── checkout/
│   │   └── create.js          # Stripe checkout
│   ├── billing/
│   │   ├── portal.js          # Billing portal
│   │   └── invoices.js        # Invoice listing
│   ├── stripe/
│   │   └── webhook.js         # Stripe webhooks
│   ├── search/
│   │   ├── start.js           # Start search job
│   │   ├── status.js          # Get job status
│   │   └── process.js        # Process job
│   └── analyze.js             # Analysis endpoint (serverless)
└── lib/
    └── stripePlans.js         # Stripe plan configuration
```

---

## 3. Serverless Functions

**Location:** `server/api/`  
**Purpose:** Individual API endpoints that can be deployed to serverless platforms (Vercel, Netlify, etc.)

### Available Functions:

1. **`server/api/analyze.js`** - Twitter handle analysis (placeholder)
2. **`server/api/checkout/create.js`** - Stripe checkout creation
3. **`server/api/billing/portal.js`** - Billing portal session
4. **`server/api/billing/invoices.js`** - Invoice retrieval
5. **`server/api/stripe/webhook.js`** - Stripe webhook handler
6. **`server/api/search/start.js`** - Start async search job
7. **`server/api/search/status.js`** - Get search job status
8. **`server/api/search/process.js`** - Process search job

These can be deployed individually to serverless platforms or run locally via the Express server.

---

## 4. Simulation Servers (Development)

**Location:** `simulation/`  
**Purpose:** Mock servers for development and testing

### Files:

- `simulation/analysisServer.js` - Mock analysis server (port 8002)
- `simulation/twitterServer.js` - Mock Twitter API server
- `simulation/marketServer.js` - Mock market data server
- `simulation/profileServer.js` - Mock profile server

### How to Run:

```bash
npm run dev:analysis  # Runs analysis server on port 8002
```

---

## Environment Configuration

All backend URLs are configured in `lib/appEnv.ts`:

```typescript
export const MARKET_BASE_URL = process.env.MARKET_BASE_URL || "http://localhost:8000";
export const ANALYSIS_BASE_URL = process.env.ANALYSIS_BASE_URL || "http://localhost:8002";
export const ANALYSIS_API_URL = process.env.EXPO_PUBLIC_ANALYSIS_API_URL || "http://localhost:8002/api";
export const STOCK_ANALYSIS_API_URL = process.env.EXPO_PUBLIC_STOCK_ANALYSIS_API_URL || "https://api.yourdomain.com/v1";
```

---

## Development Workflow

### Run All Services:

```bash
npm run dev:all
```

This runs:
- Web frontend (port 8081)
- FastAPI market server (port 8000)
- Analysis server (port 8002)

### Run Individual Services:

```bash
# Web frontend
npm run dev:web

# FastAPI market server
npm run api:dev

# Express server (Stripe/billing)
npm run server

# Analysis server (simulation)
npm run dev:analysis
```

---

## API Endpoints Summary

### Market Data API (FastAPI - Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/quotes/batch` | Batch fetch stock prices |
| GET | `/api/dividends` | Get dividend history |
| GET | `/api/profile/{handle}` | Get Twitter profile |

### Billing API (Express - Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkout/create` | Create Stripe checkout |
| POST | `/api/stripe/webhook` | Stripe webhook handler |
| POST | `/api/billing/portal` | Create billing portal |
| GET | `/api/billing/invoices` | Get user invoices |
| POST | `/api/search/process` | Process search job |
| GET | `/health` | Health check |

---

## Deployment

### FastAPI Server

Deployed separately (e.g., on Render):
- Set `MARKET_BASE_URL` environment variable to point to deployed URL
- Uses Python 3.11.9 (specified in `server/runtime.txt`)
- Dependencies in `server/requirements.txt`

### Express Server

Can be deployed to:
- **Vercel** - As serverless functions
- **Netlify** - As serverless functions
- **Render/Railway** - As a Node.js service
- **Local** - Via `npm run server`

### Serverless Functions

Individual functions in `server/api/` can be deployed to:
- **Vercel** - Automatic detection of serverless functions
- **Netlify** - As Netlify Functions
- **AWS Lambda** - With appropriate wrapper

---

## Key Dependencies

### FastAPI Server:
- `fastapi` - Web framework
- `requests` - HTTP client
- `python-dateutil` - Date handling

### Express Server:
- `express` - Web framework
- `@supabase/supabase-js` - Supabase client
- `stripe` - Stripe SDK

---

## Notes

1. **CORS Configuration**: FastAPI server has CORS enabled for localhost origins
2. **Environment Variables**: All sensitive keys stored in `.env` file
3. **Development vs Production**: Different base URLs configured via environment variables
4. **Simulation Servers**: Used for development when real APIs aren't available

---

## Where to Add New Endpoints

### For Market Data:
Add to `server/main.py` (FastAPI)

### For Billing/Stripe:
Add to `server/api/` as a new serverless function, then register in `server/index.js`

### For Analysis:
Currently using external service, but you can add to `server/api/analyze.js` or create new endpoints in `server/api/`
