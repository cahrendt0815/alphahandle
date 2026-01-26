from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
from datetime import datetime, timedelta
from dateutil import tz
import time
import os

# ============================================================================
# EODHD API Configuration
# ============================================================================
EODHD_API_TOKEN = os.environ.get('EODHD_API_TOKEN', '68e8d3117def78.19109345')
EODHD_BASE_URL = 'https://eodhd.com/api'

# ============================================================================
# Twitter API Configuration
# ============================================================================
TWITTER_API_KEY = os.environ.get('TWITTER_API_KEY', 'new1_080d8c24606a4c4f9e3ccc2023c9f50a')

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
# Request/Response Models
# ============================================================================
class PriceRequest(BaseModel):
    symbol: str
    type: str  # 'entry' or 'latest'
    tweetTimestamp: Optional[str] = None


class BatchQuotesRequest(BaseModel):
    requests: List[PriceRequest]


class PriceResponse(BaseModel):
    symbol: str
    type: str
    price: Optional[float] = None
    asof: Optional[str] = None
    error: Optional[str] = None


class BatchQuotesResponse(BaseModel):
    data: List[PriceResponse]
    errors: List[dict] = []


class DividendRow(BaseModel):
    date: str
    value: float


# ============================================================================
# Helper Functions
# ============================================================================
def retry_with_backoff(func, max_retries=3, backoff_delays=[0.5, 1, 2]):
    """Retry function with exponential backoff."""
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
    print(f"[Retry] All attempts failed. Last error: {type(last_error).__name__}: {str(last_error)}")
    return None


def normalize_symbol(symbol: str) -> str:
    """Convert symbol to EODHD format (e.g., AAPL -> AAPL.US)."""
    symbol = symbol.upper().strip()
    if '.' not in symbol:
        # Assume US stocks if no exchange specified
        symbol = f"{symbol}.US"
    return symbol


def get_entry_price(symbol: str, tweet_timestamp: str) -> tuple:
    """
    Get OPEN price for the next trading day after tweet timestamp.

    Returns:
        (price, asof_date) tuple or (None, None) if unavailable
    """
    def fetch():
        tweet_dt = datetime.fromisoformat(tweet_timestamp.replace('Z', '+00:00'))

        # Request 10 days of data to find next trading day
        start_date = tweet_dt.date()
        end_date = start_date + timedelta(days=10)

        normalized_symbol = normalize_symbol(symbol)
        url = f"{EODHD_BASE_URL}/eod/{normalized_symbol}"
        params = {
            'api_token': EODHD_API_TOKEN,
            'from': start_date.strftime('%Y-%m-%d'),
            'to': end_date.strftime('%Y-%m-%d'),
            'fmt': 'json'
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data or not isinstance(data, list):
            return (None, None)

        # Find first trading day after tweet
        for row in data:
            trade_date = datetime.fromisoformat(row['date']).replace(tzinfo=tz.UTC)
            if trade_date > tweet_dt:
                price = float(row['open'])
                asof = row['date']
                return (price, asof)

        return (None, None)

    result = retry_with_backoff(fetch)
    return result if result else (None, None)


def get_latest_price(symbol: str) -> tuple:
    """
    Get latest real-time price.

    Returns:
        (price, asof_date) tuple or (None, None) if unavailable
    """
    def fetch():
        normalized_symbol = normalize_symbol(symbol)
        url = f"{EODHD_BASE_URL}/real-time/{normalized_symbol}"
        params = {
            'api_token': EODHD_API_TOKEN,
            'fmt': 'json'
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data or 'close' not in data:
            return (None, None)

        # Use 'close' as the latest price
        price = float(data['close'])

        # Get timestamp from response
        timestamp = data.get('timestamp')
        if timestamp:
            asof = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
        else:
            asof = datetime.now().strftime('%Y-%m-%d')

        return (price, asof)

    result = retry_with_backoff(fetch)
    return result if result else (None, None)


# ============================================================================
# API Endpoints
# ============================================================================
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "provider": "eodhd",
        "api_configured": bool(EODHD_API_TOKEN)
    }


@app.post("/api/quotes/batch", response_model=BatchQuotesResponse)
async def batch_quotes(request: BatchQuotesRequest):
    """
    Batch fetch prices for multiple symbols.
    """
    results = []
    errors = []

    for req in request.requests:
        try:
            if req.type == 'entry':
                if not req.tweetTimestamp:
                    errors.append({
                        "symbol": req.symbol,
                        "type": req.type,
                        "message": "tweetTimestamp required for entry price"
                    })
                    continue

                price, asof = get_entry_price(req.symbol, req.tweetTimestamp)

                if price is None:
                    errors.append({
                        "symbol": req.symbol,
                        "type": req.type,
                        "message": "Could not fetch entry price"
                    })
                else:
                    results.append(PriceResponse(
                        symbol=req.symbol,
                        type=req.type,
                        price=price,
                        asof=asof
                    ))

            elif req.type == 'latest':
                price, asof = get_latest_price(req.symbol)

                if price is None:
                    errors.append({
                        "symbol": req.symbol,
                        "type": req.type,
                        "message": "Could not fetch latest price"
                    })
                else:
                    results.append(PriceResponse(
                        symbol=req.symbol,
                        type=req.type,
                        price=price,
                        asof=asof
                    ))

        except Exception as e:
            errors.append({
                "symbol": req.symbol,
                "type": req.type,
                "message": str(e)
            })

    return BatchQuotesResponse(data=results, errors=errors)


@app.get("/api/dividends")
async def dividends(symbol: str):
    """
    Get dividend history for a symbol (stub - EODHD has dividends API if needed).
    """
    return []


@app.get("/api/profile/{handle}")
async def get_profile(handle: str):
    """
    Get Twitter profile information for a handle.
    Fetches from TwitterAPI.io and returns profile data.
    """
    # Remove @ if present
    clean_handle = handle.replace('@', '')

    try:
        headers = { 'x-api-key': TWITTER_API_KEY }

        # Prefer twitterapi.io's Twitter-compatible path
        url_v2 = f"https://api.twitterapi.io/twitter/user/by/username/{clean_handle}"
        resp = requests.get(url_v2, headers=headers, timeout=10)
        if resp.status_code != 200:
            # Fallback legacy path
            url_v1 = f"https://api.twitterapi.io/v1/user/by/username/{clean_handle}"
            resp = requests.get(url_v1, headers=headers, timeout=10)
        resp.raise_for_status()
        raw = resp.json() or {}

        # Normalize potential shapes
        node = raw.get('data') if isinstance(raw.get('data'), dict) else raw
        public_metrics = node.get('public_metrics') if isinstance(node, dict) else None

        followers = 0
        following = 0
        if public_metrics and isinstance(public_metrics, dict):
            followers = public_metrics.get('followers_count') or 0
            following = public_metrics.get('following_count') or 0
        else:
            followers = node.get('followers_count') or node.get('followers') or 0
            following = node.get('friends_count') or node.get('following') or 0

        image_url = node.get('profile_image_url') or node.get('profile_image_url_https')
        name = node.get('name') or clean_handle
        username = node.get('username') or clean_handle
        verified = bool(node.get('verified', False))
        description = node.get('description') or node.get('bio') or ''
        created_at = node.get('created_at') or node.get('joined') or ''

        profile = {
            "imageUrl": image_url,
            "name": name,
            "username": username,
            "verified": verified,
            "description": description,
            "created_at": created_at,
            "followers_count": followers,
            "friends_count": following,
            "profile_url": f"https://x.com/{clean_handle}/photo"
        }

        return profile

    except requests.exceptions.RequestException as e:
        print(f"[Profile] Error fetching profile for {handle}: {str(e)}")
        # Return fallback profile
        return {
            "imageUrl": f"https://ui-avatars.com/api/?name={clean_handle}&size=128&background=635BFF&color=fff&bold=true",
            "name": clean_handle,
            "username": clean_handle,
            "verified": False,
            "description": "",
            "created_at": "",
            "followers_count": 0,
            "friends_count": 0,
            "profile_url": f"https://x.com/{clean_handle}/photo",
            "error": str(e)
        }
