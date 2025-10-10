from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from dateutil import tz
from pathlib import Path
import requests_cache
import time
from functools import lru_cache

# ============================================================================
# Caching Setup
# ============================================================================
# See yfinance advanced docs: https://github.com/ranaroussi/yfinance#advanced-usage
#
# Cache Strategy:
# - Historical "entry" prices (EOD data) rarely change → long TTL (30 days)
# - Latest "latest" prices stabilize after market close → medium TTL (6 hours)
#
# Note: Render free tier instances can sleep; disk cache persists while container
# is alive but may reset on redeploy. This is acceptable for MVP.
# ============================================================================

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)

# Historical cache: 30 days TTL
cache_hist = requests_cache.CachedSession(
    cache_name=str(CACHE_DIR / "hist_cache"),
    backend='sqlite',
    expire_after=86400 * 30  # 30 days
)

# Latest cache: 6 hours TTL
cache_latest = requests_cache.CachedSession(
    cache_name=str(CACHE_DIR / "latest_cache"),
    backend='sqlite',
    expire_after=6 * 3600  # 6 hours
)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:19006",
        "https://*.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Retry/Backoff Helper
# ============================================================================
def retry_with_backoff(func, max_retries=4, backoff_delays=[0.5, 1, 2, 4]):
    """
    Retry a function with exponential backoff on network errors and 429/5xx.

    Args:
        func: Callable that returns a value or raises an exception
        max_retries: Maximum number of attempts (default 4)
        backoff_delays: List of delays in seconds between retries

    Returns:
        Result from func() or None if all retries fail
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_error = e
            print(f"[Retry {attempt+1}/{max_retries}] Error: {type(e).__name__}: {str(e)}")
            if attempt < max_retries - 1:
                delay = backoff_delays[min(attempt, len(backoff_delays) - 1)]
                time.sleep(delay)
            else:
                # All retries exhausted - log final error
                print(f"[Retry] All attempts failed. Last error: {type(last_error).__name__}: {str(last_error)}")
                return None
    return None


# ============================================================================
# Price Fetching with Caching & LRU
# ============================================================================

@lru_cache(maxsize=512)
def get_entry_price(symbol: str, date_str: str, tweet_timestamp: str) -> tuple:
    """
    Get OPEN price for the next trading day after tweet timestamp.

    Args:
        symbol: Uppercase ticker symbol
        date_str: YYYY-MM-DD date string (for cache key)
        tweet_timestamp: ISO timestamp of tweet

    Returns:
        (price, asof_date) tuple or (None, None) if unavailable
    """
    def fetch():
        tweet_dt = datetime.fromisoformat(tweet_timestamp.replace('Z', '+00:00'))

        # Use cached session for historical data
        ticker = yf.Ticker(symbol, session=cache_hist)

        start_date = tweet_dt.date()
        end_date = start_date + timedelta(days=10)

        hist = ticker.history(start=start_date, end=end_date, auto_adjust=True)

        if hist.empty:
            return (None, None)

        # Find first trading day after tweet
        for date, row in hist.iterrows():
            if date.to_pydatetime().replace(tzinfo=tz.UTC) > tweet_dt:
                price = float(row['Open'])
                asof = date.strftime('%Y-%m-%d')
                return (price, asof)

        return (None, None)

    result = retry_with_backoff(fetch)
    return result if result else (None, None)


@lru_cache(maxsize=512)
def get_latest_price(symbol: str) -> tuple:
    """
    Get CLOSE price of the previous trading day.

    Args:
        symbol: Uppercase ticker symbol

    Returns:
        (price, asof_date) tuple or (None, None) if unavailable
    """
    def fetch():
        # Use cached session for latest data
        ticker = yf.Ticker(symbol, session=cache_latest)

        hist = ticker.history(period="7d", auto_adjust=True)

        if hist.empty or len(hist) < 2:
            return (None, None)

        # Get second-to-last row (previous trading day close)
        price = float(hist.iloc[-2]['Close'])
        asof = hist.index[-2].strftime('%Y-%m-%d')
        return (price, asof)

    result = retry_with_backoff(fetch)
    return result if result else (None, None)


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/api/health")
def health_check():
    """Health check with optional cache stats."""
    try:
        # Get cache stats if available
        hist_hits = len(cache_hist.cache.responses) if hasattr(cache_hist.cache, 'responses') else 0
        latest_hits = len(cache_latest.cache.responses) if hasattr(cache_latest.cache, 'responses') else 0

        return {
            "status": "ok",
            "cache": {
                "hist_entries": hist_hits,
                "latest_entries": latest_hits
            }
        }
    except:
        return {"status": "ok"}


@app.get("/api/dividends")
def get_dividends(symbol: str, range: str = "5y"):
    """
    Get dividend history for a symbol.

    Args:
        symbol: Stock ticker symbol (e.g., AAPL)
        range: Time range (e.g., 5y, 1y, 6mo)

    Returns:
        List of {date, amount} objects
    """
    try:
        symbol = symbol.upper()
        ticker = yf.Ticker(symbol, session=cache_hist)
        dividends = ticker.dividends

        if dividends.empty:
            return []

        # Filter by range
        end_date = datetime.now()
        if range.endswith('y'):
            years = int(range[:-1])
            start_date = end_date - timedelta(days=365 * years)
        elif range.endswith('mo'):
            months = int(range[:-2])
            start_date = end_date - timedelta(days=30 * months)
        else:
            start_date = end_date - timedelta(days=365 * 5)  # default 5 years

        dividends = dividends[dividends.index >= start_date]

        # Convert to list of {date, amount}
        result = [
            {
                "date": date.strftime("%Y-%m-%d"),
                "amount": float(amount)
            }
            for date, amount in dividends.items()
        ]

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PriceRequest(BaseModel):
    symbol: str
    type: str  # "entry" or "latest"
    tweetTimestamp: Optional[str] = None  # Required for "entry"


class BatchQuotesRequest(BaseModel):
    requests: List[PriceRequest]


@app.post("/api/quotes/batch")
def batch_quotes(request: BatchQuotesRequest):
    """
    Fetch batch quotes with entry and latest prices.

    For each request:
    - type="entry": OPEN price of next US trading day after tweetTimestamp
    - type="latest": CLOSE price of previous trading day

    Returns:
        {
            "data": [{
                "symbol": str,
                "type": "entry" | "latest",
                "date": "YYYY-MM-DD" | null,
                "price": float | null,
                "asof": "YYYY-MM-DD" | null
            }, ...],
            "errors": [{"message": str, "symbol": str, "type": str}, ...]
        }
    """
    data = []
    errors = []

    # De-duplicate requests by (symbol, type, date)
    unique_requests = {}
    for req in request.requests:
        symbol = req.symbol.upper()
        req_type = req.type.lower()

        if req_type == "entry":
            if not req.tweetTimestamp:
                errors.append({
                    "message": "tweetTimestamp required for entry type",
                    "symbol": symbol,
                    "type": req_type
                })
                continue

            # Normalize to date for deduplication
            date_key = datetime.fromisoformat(req.tweetTimestamp.replace('Z', '+00:00')).date().isoformat()
            key = (symbol, "entry", date_key)

            if key not in unique_requests:
                unique_requests[key] = {
                    "symbol": symbol,
                    "type": "entry",
                    "tweetTimestamp": req.tweetTimestamp,
                    "date_key": date_key
                }

        elif req_type == "latest":
            key = (symbol, "latest", None)

            if key not in unique_requests:
                unique_requests[key] = {
                    "symbol": symbol,
                    "type": "latest"
                }

    # Process unique requests
    for key, req_data in unique_requests.items():
        symbol = req_data["symbol"]
        req_type = req_data["type"]

        try:
            if req_type == "entry":
                date_key = req_data["date_key"]
                tweet_timestamp = req_data["tweetTimestamp"]

                price, asof = get_entry_price(symbol, date_key, tweet_timestamp)

                if price is None:
                    errors.append({
                        "message": "Could not fetch entry price",
                        "symbol": symbol,
                        "type": "entry"
                    })
                else:
                    data.append({
                        "symbol": symbol,
                        "type": "entry",
                        "date": asof,
                        "price": price,
                        "asof": asof
                    })

            elif req_type == "latest":
                price, asof = get_latest_price(symbol)

                if price is None:
                    errors.append({
                        "message": "Could not fetch latest price",
                        "symbol": symbol,
                        "type": "latest"
                    })
                else:
                    data.append({
                        "symbol": symbol,
                        "type": "latest",
                        "date": None,
                        "price": price,
                        "asof": asof
                    })

        except Exception as e:
            errors.append({
                "message": str(e),
                "symbol": symbol,
                "type": req_type
            })

    return {
        "data": data,
        "errors": errors
    }
