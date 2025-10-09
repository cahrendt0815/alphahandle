from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from dateutil import tz

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


@app.get("/api/health")
def health_check():
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
        ticker = yf.Ticker(symbol)
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


class QuoteRequest(BaseModel):
    symbol: str
    tweetTimestamp: str  # ISO 8601 format


class BatchQuotesRequest(BaseModel):
    quotes: List[QuoteRequest]


def get_next_trading_day_open(symbol: str, tweet_timestamp: str) -> Optional[float]:
    """
    Get the OPEN price of the next US trading day after the tweet timestamp.
    """
    try:
        tweet_dt = datetime.fromisoformat(tweet_timestamp.replace('Z', '+00:00'))
        ticker = yf.Ticker(symbol)

        # Fetch historical data starting from tweet date
        start_date = tweet_dt.date()
        end_date = start_date + timedelta(days=10)  # Look ahead 10 days for next trading day

        hist = ticker.history(start=start_date, end=end_date)

        if hist.empty:
            return None

        # Get the first trading day after the tweet
        for date, row in hist.iterrows():
            if date.to_pydatetime().replace(tzinfo=tz.UTC) > tweet_dt:
                return float(row['Open'])

        return None

    except Exception:
        return None


def get_previous_trading_day_close(symbol: str) -> Optional[float]:
    """
    Get the CLOSE price of the previous trading day.
    """
    try:
        ticker = yf.Ticker(symbol)

        # Fetch last 5 days to ensure we get previous trading day
        hist = ticker.history(period="5d")

        if hist.empty or len(hist) < 2:
            return None

        # Get second-to-last row (previous trading day)
        return float(hist.iloc[-2]['Close'])

    except Exception:
        return None


@app.post("/api/quotes/batch")
def batch_quotes(request: BatchQuotesRequest):
    """
    Fetch batch quotes with entry and latest prices.

    For each quote:
    - entry: OPEN price of next US trading day after tweetTimestamp
    - latest: CLOSE price of previous trading day

    Returns:
        {
            "data": [{"symbol": str, "entry": float, "latest": float}, ...],
            "errors": [{"symbol": str, "error": str}, ...]
        }
    """
    data = []
    errors = []

    for quote_req in request.quotes:
        try:
            symbol = quote_req.symbol
            tweet_timestamp = quote_req.tweetTimestamp

            entry_price = get_next_trading_day_open(symbol, tweet_timestamp)
            latest_price = get_previous_trading_day_close(symbol)

            if entry_price is None or latest_price is None:
                errors.append({
                    "symbol": symbol,
                    "error": "Could not fetch entry or latest price"
                })
                continue

            data.append({
                "symbol": symbol,
                "entry": entry_price,
                "latest": latest_price
            })

        except Exception as e:
            errors.append({
                "symbol": quote_req.symbol,
                "error": str(e)
            })

    return {
        "data": data,
        "errors": errors
    }
