# Runtime Error Fixes - Complete Summary

## Problem
Frontend was showing error: "Cannot connect to analysis server at http://localhost:8002. Please start it with: npm run dev:analysis"

## Root Causes Found

1. **PortalScreen.js line 274**: Hardcoded `http://localhost:8002/api/analyze/results/${sid}` in `pollForMoreResults` function
2. **PortalScreen.js line 174**: Reference to undefined `cachedData` variable
3. **services/stockAnalysisApiClient.js**: Used non-existent `ANALYSIS_API_URL` from lib/appEnv.ts
4. **Error messages**: Referenced old analysis server

## Files Modified

### 1. `screens/PortalScreen.js`
**Line 174**: Removed `cachedData` reference
```javascript
// BEFORE:
if (cachedData && mounted) { ... }

// AFTER:
// Removed - no cached data needed
```

**Lines 261-335**: Removed entire `pollForMoreResults` function
```javascript
// BEFORE:
const pollForMoreResults = async (sid, mounted) => {
  const response = await fetch(`http://localhost:8002/api/analyze/results/${sid}`);
  ...
};

// AFTER:
// Polling removed - analyst API returns complete results synchronously via /api/analyze
```

**Line 252**: Updated error message
```javascript
// BEFORE:
setAnalysisError(error.message || 'Failed to fetch analysis.');

// AFTER:
const userMessage = 'Analysis temporarily unavailable. Please try again.';
console.error('[Portal] Analysis error details:', error);
setAnalysisError(userMessage);
```

**Analysis Request (Line 175)**: Already correct
```javascript
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ handle, months: timelineMonths }),
});
```

### 2. `screens/ResultsScreen.js`
**Line 90**: Updated error message
```javascript
// BEFORE:
setSaveError('Could not load analysis');

// AFTER:
setSaveError('Analysis temporarily unavailable. Please try again.');
```

**Analysis Request (Line 57)**: Already correct
```javascript
fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ handle, months: 12 }),
})
```

### 3. `screens/TestStockAnalysisScreen.js`
**Changes:**
- Removed `endpointUrl` state and input field
- Updated to call `/api/analyze` directly
- Simplified error handling
- Removed CORS help UI

```javascript
// BEFORE:
const [endpointUrl, setEndpointUrl] = useState('');
// ... build URL from endpointUrl
const data = await apiRequest(url.toString(), ...);

// AFTER:
// Direct call to /api/analyze
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ handle: cleanHandle, months: monthsNum }),
});
```

### 4. `services/stockAnalysisApiClient.js`
**Status:** ✅ **DELETED**
- Frontend should use `/api/analyze` directly
- No need for this abstraction layer

### 5. `lib/appEnv.ts`
**Status:** ✅ **Already clean**
- Only has `STOCK_ANALYSIS_API_URL` (used by backend only)
- No `ANALYSIS_BASE_URL` or `ANALYSIS_API_URL`
- No localhost:8002 fallbacks

## Verification - All Analysis Requests

### ✅ PortalScreen.js
```javascript
fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ handle, months: timelineMonths }),
})
```

### ✅ ResultsScreen.js
```javascript
fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ handle, months: 12 }),
})
```

### ✅ TestStockAnalysisScreen.js
```javascript
fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ handle: cleanHandle, months: monthsNum }),
})
```

## Removed References

### ❌ Deleted:
- `http://localhost:8002` (hardcoded in pollForMoreResults)
- `services/stockAnalysisApiClient.js` (entire file)
- `cachedData` variable reference
- `pollForMoreResults` function
- `endpointUrl` input in TestStockAnalysisScreen
- CORS-specific error messages

### ✅ Kept (Backend Only):
- `STOCK_ANALYSIS_API_URL` in `lib/appEnv.ts` (used by `server/api/analyze.js`)

## Error Messages

### User-Facing (Generic):
- "Analysis temporarily unavailable. Please try again."

### Developer (Console):
- Full error details logged to console
- Includes status codes, error messages, stack traces

## Single Analysis Codepath

**Only one path exists:**
1. User searches handle
2. Frontend calls `POST /api/analyze` with `{ handle, months }`
3. Backend validates and forwards to external analyst API
4. Backend returns response to frontend
5. Frontend displays results

**No:**
- Polling
- Caching (handled by analyst API)
- Multiple codepaths
- Direct external API calls from frontend

## Testing Instructions

### Local Testing:
```bash
# Terminal 1: Start backend
npm run server
# Should show: Server running on http://localhost:3000

# Terminal 2: Start frontend
npm run dev:web
# Should show: Running on http://localhost:8081

# Test:
# 1. Navigate to http://localhost:8081/portal
# 2. Enter a handle (e.g., @rubicon59)
# 3. Click "Analyze"
# 4. Should call: POST http://localhost:8081/api/analyze
# 5. Backend logs should show: "[Analyze] Forwarding request to analyst API: ..."
```

### Vercel Testing:
1. **Set environment variables in Vercel:**
   - `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL` = your analyst API URL
   - `STOCK_ANALYSIS_API_TOKEN` or `STOCK_ANALYSIS_API_KEY` (if needed)

2. **Remove old env vars:**
   - `ANALYSIS_BASE_URL`
   - `ANALYSIS_API_URL`
   - `EXPO_PUBLIC_ANALYSIS_API_URL`

3. **Deploy and test:**
   - Navigate to your Vercel URL
   - Search for a handle
   - Should call `POST /api/analyze` (relative path, same origin)
   - Check Vercel function logs for backend activity

## Files Modified Summary

| File | Changes |
|------|---------|
| `screens/PortalScreen.js` | Removed pollForMoreResults, cachedData, updated error message |
| `screens/ResultsScreen.js` | Updated error message |
| `screens/TestStockAnalysisScreen.js` | Removed endpointUrl, updated to use /api/analyze, simplified errors |
| `services/stockAnalysisApiClient.js` | **DELETED** |
| `lib/appEnv.ts` | Already clean (no changes needed) |

## Result

✅ **Frontend only calls `POST /api/analyze`** (relative path, same origin)
✅ **No references to localhost:8002**
✅ **No references to old analysis server**
✅ **Generic error messages for users**
✅ **Single analysis codepath**
✅ **Backend acts as thin proxy**

The error "Cannot connect to analysis server at http://localhost:8002" should no longer appear.
