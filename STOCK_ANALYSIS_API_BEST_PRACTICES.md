# Stock Analysis API Integration - Best Practices Guide

## Overview

This guide outlines best practices for integrating with your data analyst's stock analysis API endpoint. The implementation includes error handling, retry logic, caching, and proper request/response management.

## Implementation

### 1. API Client Service

The main API client is located in `services/stockAnalysisApiClient.js` and provides:

- **Automatic retry logic** with exponential backoff
- **Request timeout handling**
- **Response caching** (optional)
- **Rate limit handling** (429 responses)
- **Custom error types** for better error handling
- **Request/response validation**

### 2. Usage Example

```javascript
import { requestStockAnalysis, APIError, NetworkError, TimeoutError } from '../services/stockAnalysisApiClient';

try {
  const result = await requestStockAnalysis('@elonmusk', {
    months: 12,
    useCache: true, // Use cached response if available
  });
  
  console.log('Analysis complete:', result);
} catch (error) {
  if (error instanceof APIError) {
    // Handle API errors (4xx, 5xx)
    console.error('API Error:', error.status, error.message);
  } else if (error instanceof NetworkError) {
    // Handle network errors
    console.error('Network Error:', error.message);
  } else if (error instanceof TimeoutError) {
    // Handle timeout errors
    console.error('Timeout:', error.message);
  }
}
```

## Best Practices

### 1. **Error Handling**

Always use try-catch blocks and handle specific error types:

```javascript
try {
  const data = await requestStockAnalysis(handle, options);
  // Handle success
} catch (error) {
  if (error instanceof APIError) {
    // Show user-friendly message based on status code
    if (error.status === 400) {
      showError('Invalid request. Please check your input.');
    } else if (error.status === 401) {
      showError('Authentication required. Please sign in.');
    } else if (error.status === 429) {
      showError('Too many requests. Please wait a moment.');
    } else {
      showError('Server error. Please try again later.');
    }
  } else if (error instanceof NetworkError) {
    showError('Connection error. Please check your internet.');
  } else if (error instanceof TimeoutError) {
    showError('Request timed out. The analysis may take longer.');
  }
}
```

### 2. **Loading States**

Always show loading indicators during API calls:

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleAnalyze = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await requestStockAnalysis(handle);
    // Handle result
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 3. **Request Cancellation**

Use AbortController to cancel requests when component unmounts:

```javascript
useEffect(() => {
  const controller = new AbortController();
  let mounted = true;
  
  const fetchData = async () => {
    try {
      const result = await requestStockAnalysis(handle);
      if (mounted) {
        setData(result);
      }
    } catch (error) {
      if (mounted && !error.name === 'AbortError') {
        setError(error.message);
      }
    }
  };
  
  fetchData();
  
  return () => {
    mounted = false;
    controller.abort();
  };
}, [handle]);
```

### 4. **Caching Strategy**

Use caching for frequently accessed data:

```javascript
// Enable caching for GET requests
const result = await requestStockAnalysis(handle, {
  months: 12,
  useCache: true, // Cache response for 5 minutes
});

// Clear cache when needed
import { clearCache } from '../services/stockAnalysisApiClient';
clearCache();
```

**When to use caching:**
- ✅ Read-only data (analysis results)
- ✅ Data that doesn't change frequently
- ✅ Expensive operations that return the same result

**When NOT to use caching:**
- ❌ Real-time data
- ❌ User-specific data that changes
- ❌ POST/PUT/DELETE requests

### 5. **Retry Logic**

The API client automatically retries on:
- Network errors
- 5xx server errors
- 429 rate limit errors (with special delay)
- Timeout errors

**Custom retry configuration:**

```javascript
const result = await apiRequest(url, options, {
  maxRetries: 5, // Increase retries for critical requests
  timeout: 60000, // Longer timeout for complex analysis
});
```

### 6. **Rate Limiting**

Handle rate limits gracefully:

```javascript
try {
  const result = await requestStockAnalysis(handle);
} catch (error) {
  if (error instanceof APIError && error.status === 429) {
    // Show user-friendly message
    showMessage('Too many requests. Please wait a moment before trying again.');
    // Optionally: implement exponential backoff in UI
  }
}
```

### 7. **Request Validation**

Validate input before making API calls:

```javascript
const validateHandle = (handle) => {
  if (!handle || handle.trim().length === 0) {
    throw new Error('Handle is required');
  }
  const cleanHandle = handle.replace(/^@/, '');
  if (cleanHandle.length > 15) {
    throw new Error('Handle must be 15 characters or less');
  }
  return cleanHandle;
};

const handleAnalyze = async () => {
  try {
    const cleanHandle = validateHandle(twitterHandle);
    const result = await requestStockAnalysis(cleanHandle);
    // ...
  } catch (error) {
    // Handle validation errors
  }
};
```

### 8. **Response Validation**

Validate API responses before using them:

```javascript
const validateAnalysisResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format');
  }
  
  // Check required fields
  if (!data.trades || !Array.isArray(data.trades)) {
    throw new Error('Missing or invalid trades array');
  }
  
  if (typeof data.stats !== 'object') {
    throw new Error('Missing or invalid stats object');
  }
  
  return data;
};

const result = await requestStockAnalysis(handle);
const validated = validateAnalysisResponse(result);
```

### 9. **Environment Configuration**

Set up environment variables in `.env`:

```env
# Stock Analysis API Configuration
EXPO_PUBLIC_STOCK_ANALYSIS_API_URL=https://api.yourdomain.com/v1
EXPO_PUBLIC_STOCK_ANALYSIS_API_TOKEN=your_bearer_token_here
# OR use API key instead:
EXPO_PUBLIC_STOCK_ANALYSIS_API_KEY=your_api_key_here
```

Update `lib/appEnv.ts`:

```typescript
export const STOCK_ANALYSIS_API_URL = 
  process.env.EXPO_PUBLIC_STOCK_ANALYSIS_API_URL || 
  "https://api.yourdomain.com/v1";
```

### 10. **Logging and Monitoring**

Add logging for debugging and monitoring:

```javascript
// The API client already logs requests in development mode
// Add custom logging for important events:

console.log('[App] Starting analysis for:', handle);
const startTime = Date.now();

try {
  const result = await requestStockAnalysis(handle);
  const duration = Date.now() - startTime;
  console.log(`[App] Analysis completed in ${duration}ms`);
  
  // Track analytics
  analytics.track('analysis_completed', {
    handle,
    duration,
    tradesCount: result.trades?.length || 0,
  });
} catch (error) {
  const duration = Date.now() - startTime;
  console.error(`[App] Analysis failed after ${duration}ms:`, error);
  
  // Track errors
  analytics.track('analysis_failed', {
    handle,
    duration,
    errorType: error.constructor.name,
    errorMessage: error.message,
  });
}
```

### 11. **TypeScript Types (Recommended)**

Create TypeScript interfaces for type safety:

```typescript
// types/stockAnalysis.ts
export interface StockAnalysisRequest {
  handle: string;
  months?: number;
  since?: string;
  until?: string;
}

export interface Trade {
  ticker: string;
  date: string;
  entryPrice: number;
  latestPrice: number;
  return: number;
  returnPct: number;
  sentiment: 'bullish' | 'bearish';
}

export interface AnalysisStats {
  avgReturn: number;
  alpha: number;
  winRate: number;
  hitRatio: number;
  totalTrades: number;
}

export interface StockAnalysisResponse {
  sessionId?: string;
  handle: string;
  trades: Trade[];
  stats: AnalysisStats;
  status: 'completed' | 'processing' | 'error';
  cached?: boolean;
}
```

### 12. **Error Recovery**

Implement error recovery strategies:

```javascript
const analyzeWithRetry = async (handle, maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestStockAnalysis(handle, {
        useCache: attempt === 1, // Only use cache on first attempt
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error; // Last attempt failed
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

### 13. **Request Debouncing**

Prevent duplicate requests:

```javascript
import { debounce } from 'lodash';

const debouncedAnalyze = debounce(async (handle) => {
  try {
    const result = await requestStockAnalysis(handle);
    setData(result);
  } catch (error) {
    setError(error.message);
  }
}, 500); // Wait 500ms after user stops typing

// Usage
<TextInput
  onChangeText={(text) => {
    setHandle(text);
    debouncedAnalyze(text);
  }}
/>
```

### 14. **Progress Tracking**

For long-running operations, track progress:

```javascript
const [progress, setProgress] = useState(0);

// If your API supports progress updates
const pollProgress = async (sessionId) => {
  while (true) {
    const status = await getAnalysisStatus(sessionId);
    setProgress(status.progress || 0);
    
    if (status.status === 'completed') {
      break;
    }
    
    await sleep(2000); // Poll every 2 seconds
  }
};
```

## Security Best Practices

### 1. **API Key Management**

- ✅ Store API keys in environment variables
- ✅ Never commit API keys to version control
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly
- ✅ Use Bearer tokens when possible

### 2. **Input Sanitization**

```javascript
const sanitizeHandle = (handle) => {
  // Remove @ symbol
  let clean = handle.replace(/^@/, '');
  
  // Remove whitespace
  clean = clean.trim();
  
  // Validate format (alphanumeric + underscore, max 15 chars)
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(clean)) {
    throw new Error('Invalid handle format');
  }
  
  return clean.toLowerCase();
};
```

### 3. **HTTPS Only**

Always use HTTPS in production:

```javascript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.yourdomain.com'
  : 'http://localhost:8000';
```

## Testing

### 1. **Mock API Responses**

Create mock data for testing:

```javascript
// __mocks__/stockAnalysisApiClient.js
export const requestStockAnalysis = jest.fn(() => 
  Promise.resolve({
    trades: [],
    stats: { avgReturn: 0, alpha: 0, winRate: 0, hitRatio: 0, totalTrades: 0 },
  })
);
```

### 2. **Error Testing**

Test error scenarios:

```javascript
// Test network error
requestStockAnalysis.mockRejectedValueOnce(
  new NetworkError('Failed to fetch')
);

// Test API error
requestStockAnalysis.mockRejectedValueOnce(
  new APIError('Invalid handle', 400, 'INVALID_HANDLE')
);

// Test timeout
requestStockAnalysis.mockRejectedValueOnce(
  new TimeoutError('Request timeout', 30000)
);
```

## Performance Optimization

### 1. **Request Batching**

If your API supports it, batch multiple requests:

```javascript
// Instead of multiple requests:
const results = await Promise.all([
  requestStockAnalysis('@handle1'),
  requestStockAnalysis('@handle2'),
  requestStockAnalysis('@handle3'),
]);
```

### 2. **Lazy Loading**

Load data only when needed:

```javascript
const [data, setData] = useState(null);
const [shouldLoad, setShouldLoad] = useState(false);

useEffect(() => {
  if (shouldLoad && !data) {
    requestStockAnalysis(handle).then(setData);
  }
}, [shouldLoad, handle, data]);
```

### 3. **Pagination**

For large datasets, implement pagination:

```javascript
const loadMoreTrades = async (page = 1) => {
  const result = await apiRequest(
    `${ANALYSIS_API_URL}/analyze/${sessionId}/trades?page=${page}&limit=50`
  );
  return result.trades;
};
```

## Integration Checklist

- [ ] Set up environment variables
- [ ] Configure API base URL
- [ ] Add authentication (API key or Bearer token)
- [ ] Implement error handling in UI
- [ ] Add loading states
- [ ] Configure caching strategy
- [ ] Set up request timeouts
- [ ] Add retry logic configuration
- [ ] Implement request cancellation
- [ ] Add response validation
- [ ] Set up logging/monitoring
- [ ] Test error scenarios
- [ ] Test network failures
- [ ] Test timeout scenarios
- [ ] Test rate limiting
- [ ] Add TypeScript types (if using TypeScript)

## Example: Complete Integration

```javascript
import React, { useState, useEffect } from 'react';
import { 
  requestStockAnalysis, 
  APIError, 
  NetworkError, 
  TimeoutError 
} from '../services/stockAnalysisApiClient';

export default function AnalysisComponent() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleAnalyze = async () => {
    if (!handle.trim()) {
      setError('Please enter a handle');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await requestStockAnalysis(handle, {
        months: 12,
        useCache: true,
      });
      
      setData(result);
    } catch (err) {
      let errorMessage = 'An error occurred';
      
      if (err instanceof APIError) {
        if (err.status === 400) {
          errorMessage = 'Invalid handle. Please check your input.';
        } else if (err.status === 401) {
          errorMessage = 'Authentication required. Please sign in.';
        } else if (err.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment.';
        } else if (err.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.message;
        }
      } else if (err instanceof NetworkError) {
        errorMessage = 'Connection error. Please check your internet.';
      } else if (err instanceof TimeoutError) {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = err.message || 'Unknown error';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        value={handle}
        onChangeText={setHandle}
        placeholder="@username"
      />
      <Button 
        onPress={handleAnalyze} 
        disabled={loading}
        title={loading ? 'Analyzing...' : 'Analyze'}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {data && <AnalysisResults data={data} />}
    </View>
  );
}
```

## Next Steps

1. **Update your existing code** to use the new `stockAnalysisApiClient.js`
2. **Replace** calls to `dummyAnalysisService.js` with real API calls
3. **Add environment variables** for your API endpoint
4. **Test** with your data analyst's API endpoint
5. **Monitor** error rates and response times
6. **Optimize** caching and retry strategies based on usage patterns
