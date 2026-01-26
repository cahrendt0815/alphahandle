# API Integration Guide

## Overview

This guide outlines what's needed in the app to call the new external API service that handles:
- Twitter search
- Sentiment analysis
- Caching (handled by the service)

## Current Architecture

The app currently calls:
- **Endpoint**: `${ANALYSIS_BASE_URL}/api/analyze`
- **Method**: GET
- **Parameters**: `handle`, `months`
- **Response**: Analysis results with sessionId for polling

## Required Changes

### 1. Environment Configuration

Add to `.env` file:
```env
# New Analysis API Service URL
ANALYSIS_API_URL=https://your-analysis-service.com/api
# Or for local development:
# ANALYSIS_API_URL=http://localhost:8002/api
```

Update `lib/appEnv.ts`:
```typescript
export const ANALYSIS_API_URL = process.env.EXPO_PUBLIC_ANALYSIS_API_URL || "http://localhost:8002/api";
```

### 2. API Endpoint Structure

The new service should provide these endpoints:

#### 2.1 Start Analysis
```
GET /api/analyze?handle=@username&months=12
```

**Request:**
- `handle` (required): Twitter handle (with or without @)
- `months` (optional): Number of months to analyze (default: 12)

**Response:**
```json
{
  "sessionId": "uuid-string",
  "handle": "@username",
  "months": 12,
  "status": "processing" | "completed" | "error",
  "totalTweets": 0,
  "stockTweets": 0,
  "trades": [],
  "stats": {
    "avgReturn": 0,
    "alpha": 0,
    "winRate": 0,
    "hitRatio": 0,
    "totalTrades": 0
  },
  "hasMore": false,
  "cached": false
}
```

#### 2.2 Poll for Results (if async)
```
GET /api/analyze/{sessionId}
```

**Response:**
```json
{
  "sessionId": "uuid-string",
  "status": "processing" | "completed" | "error",
  "totalTweets": 150,
  "stockTweets": 45,
  "trades": [...],
  "stats": {...},
  "hasMore": true,
  "progress": {
    "processed": 45,
    "total": 150,
    "percentage": 30
  }
}
```

#### 2.3 Get Final Results
```
GET /api/analyze/{sessionId}/complete
```

**Response:**
```json
{
  "sessionId": "uuid-string",
  "status": "completed",
  "handle": "@username",
  "months": 12,
  "totalTweets": 150,
  "stockTweets": 45,
  "trades": [
    {
      "ticker": "AAPL",
      "date": "2024-01-15T10:30:00Z",
      "sentiment": "bullish",
      "entryPrice": 150.25,
      "latestPrice": 175.50,
      "return": 16.8,
      "returnPct": 11.2,
      "daysHeld": 30
    }
  ],
  "stats": {
    "avgReturn": 12.5,
    "alpha": 8.3,
    "winRate": 65.5,
    "hitRatio": 70.0,
    "totalTrades": 45
  },
  "cached": true
}
```

### 3. Service Layer Updates

Create a new service file: `services/analysisApiService.js`

```javascript
import { ANALYSIS_API_URL } from '../lib/appEnv';

/**
 * Start analysis for a Twitter handle
 * @param {string} handle - Twitter handle
 * @param {number} months - Number of months to analyze
 * @returns {Promise<object>} Initial analysis response
 */
export async function startAnalysis(handle, months = 12) {
  const cleanHandle = handle.replace('@', '');
  const url = `${ANALYSIS_API_URL}/analyze?handle=${encodeURIComponent(cleanHandle)}&months=${months}`;
  
  console.log(`[AnalysisAPI] Starting analysis: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Analysis API error ${response.status}: ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Poll for analysis results
 * @param {string} sessionId - Session ID from startAnalysis
 * @returns {Promise<object>} Current analysis state
 */
export async function pollAnalysis(sessionId) {
  const url = `${ANALYSIS_API_URL}/analyze/${sessionId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Poll API error ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get final analysis results
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Complete analysis results
 */
export async function getCompleteAnalysis(sessionId) {
  const url = `${ANALYSIS_API_URL}/analyze/${sessionId}/complete`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Complete API error ${response.status}`);
  }
  
  return await response.json();
}
```

### 4. Update PortalScreen.js

Replace the current analysis call in `screens/PortalScreen.js`:

**Current code (around line 199-225):**
```javascript
const analysisResponse = await fetch(`${ANALYSIS_BASE_URL}/api/analyze?handle=${encodeURIComponent(handle)}&months=${timelineMonths}`, {
  signal: AbortSignal.timeout(timeoutMs)
});
```

**New code:**
```javascript
import { startAnalysis, pollAnalysis, getCompleteAnalysis } from '../services/analysisApiService';

// Start analysis
const initialResponse = await startAnalysis(handle, timelineMonths);

// If async, poll for results
if (initialResponse.status === 'processing' && initialResponse.sessionId) {
  // Poll until complete
  let currentStatus = initialResponse;
  while (currentStatus.status === 'processing' && currentStatus.hasMore) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    currentStatus = await pollAnalysis(currentStatus.sessionId);
    // Update UI with current results
  }
  
  // Get final results
  const finalResults = await getCompleteAnalysis(currentStatus.sessionId);
  // Use finalResults
}
```

### 5. Response Data Structure

The API should return trades in this format:

```typescript
interface Trade {
  ticker: string;           // Stock symbol (e.g., "AAPL")
  date: string;            // ISO 8601 date (e.g., "2024-01-15T10:30:00Z")
  sentiment: "bullish" | "bearish";
  entryPrice: number;      // Price at tweet date
  latestPrice: number;     // Current/latest price
  return: number;          // Absolute return
  returnPct: number;       // Percentage return
  daysHeld: number;       // Days since tweet
  tweetId?: string;       // Optional: Twitter tweet ID
  tweetText?: string;     // Optional: Tweet content
}

interface AnalysisStats {
  avgReturn: number;      // Average return percentage
  alpha: number;          // Alpha vs benchmark
  winRate: number;        // Win rate percentage (0-100)
  hitRatio: number;       // Hit ratio percentage (0-100)
  totalTrades: number;    // Total number of trades
}
```

### 6. Error Handling

The API should return appropriate HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters (missing handle, invalid months)
- `404 Not Found`: Session ID not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

Error response format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 7. Caching

Since caching is handled by the service:
- The service should return `"cached": true` in the response if using cached data
- The app doesn't need to implement client-side caching
- The service should handle cache invalidation

### 8. Authentication (if needed)

If the API requires authentication, add to requests:

```javascript
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`, // If needed
  },
});
```

Add to `.env`:
```env
ANALYSIS_API_TOKEN=your-api-token-here
```

### 9. Timeout Configuration

Update timeout logic in PortalScreen:

```javascript
// Dynamic timeout based on months
const timeoutMs = Math.min(180000, 60000 + Math.ceil(timelineMonths / 12) * 30000);

// For async operations, use polling with timeout
const startTime = Date.now();
while (currentStatus.status === 'processing') {
  if (Date.now() - startTime > timeoutMs) {
    throw new Error('Analysis timeout');
  }
  // Poll...
}
```

## Migration Checklist

- [ ] Add `ANALYSIS_API_URL` to environment variables
- [ ] Update `lib/appEnv.ts` with new API URL
- [ ] Create `services/analysisApiService.js`
- [ ] Update `screens/PortalScreen.js` to use new service
- [ ] Update error handling for new API responses
- [ ] Test with real API endpoint
- [ ] Remove old analysis server code (if no longer needed)
- [ ] Update documentation

## Testing

Test the integration:

1. **Start analysis:**
   ```javascript
   const result = await startAnalysis('@elonmusk', 12);
   console.log('Session ID:', result.sessionId);
   ```

2. **Poll for results:**
   ```javascript
   const status = await pollAnalysis(sessionId);
   console.log('Status:', status.status);
   ```

3. **Get final results:**
   ```javascript
   const final = await getCompleteAnalysis(sessionId);
   console.log('Trades:', final.trades.length);
   ```

## Notes

- The service should handle all Twitter API calls internally
- The service should handle sentiment analysis internally
- The service should handle caching internally
- The app only needs to call the API and display results
- Consider implementing retry logic for failed requests
- Consider implementing exponential backoff for polling
