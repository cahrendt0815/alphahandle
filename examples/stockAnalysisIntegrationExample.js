/**
 * Example: How to integrate the Stock Analysis API into PortalScreen
 * 
 * This shows how to replace the dummy data service with the real API client
 */

import { 
  requestStockAnalysis, 
  APIError, 
  NetworkError, 
  TimeoutError 
} from '../services/stockAnalysisApiClient';

// Example 1: Basic usage in PortalScreen loadAnalysis function
export async function loadAnalysisWithAPI(handle, timelineMonths) {
  try {
    // Show loading state
    setAnalysisLoading(true);
    setAnalysisError(null);

    // Call the real API
    const analysisData = await requestStockAnalysis(handle, {
      months: timelineMonths,
      useCache: true, // Use cache for faster repeated requests
    });

    // Validate response
    if (!analysisData || !analysisData.trades || !analysisData.stats) {
      throw new Error('Invalid response format from API');
    }

    // Update UI with results
    setData({
      avgReturn: analysisData.stats.avgReturn || 0,
      alpha: analysisData.stats.alpha || 0,
      winRate: analysisData.stats.winRate || 0,
      hitRatio: analysisData.stats.hitRatio || 0,
      totalTrades: analysisData.stats.totalTrades || 0,
    });

    setAllTrades(analysisData.trades || []);
    setAnalysisLoading(false);
    setAnalysisCompleted(true);

    // Show success message if cached
    if (analysisData.cached) {
      console.log('[Portal] Using cached analysis');
    }

  } catch (error) {
    setAnalysisLoading(false);
    setAnalysisCompleted(false);

    // Handle different error types
    if (error instanceof APIError) {
      if (error.status === 400) {
        setAnalysisError('Invalid handle. Please check your input.');
      } else if (error.status === 401) {
        setAnalysisError('Authentication required. Please sign in.');
      } else if (error.status === 429) {
        setAnalysisError('Too many requests. Please wait a moment before trying again.');
      } else if (error.status >= 500) {
        setAnalysisError('Server error. Please try again later.');
      } else {
        setAnalysisError(error.message || 'API error occurred');
      }
    } else if (error instanceof NetworkError) {
      setAnalysisError('Connection error. Please check your internet connection.');
    } else if (error instanceof TimeoutError) {
      setAnalysisError('Request timed out. The analysis may take longer than expected.');
    } else {
      setAnalysisError(error.message || 'An unexpected error occurred');
    }
  }
}

// Example 2: With progress tracking (if API supports it)
export async function loadAnalysisWithProgress(handle, timelineMonths, onProgress) {
  try {
    setAnalysisLoading(true);
    
    // Start analysis
    const initialResponse = await requestStockAnalysis(handle, {
      months: timelineMonths,
      useCache: false, // Don't cache for progress tracking
    });

    // If API returns sessionId for async processing
    if (initialResponse.sessionId && initialResponse.status === 'processing') {
      // Poll for progress
      let currentStatus = initialResponse;
      
      while (currentStatus.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const status = await getAnalysisStatus(currentStatus.sessionId);
        currentStatus = status;
        
        // Update progress
        if (onProgress) {
          onProgress({
            progress: status.progress || 0,
            processed: status.processed || 0,
            total: status.total || 0,
          });
        }
      }
      
      // Get final results
      const finalData = await requestStockAnalysis(handle, {
        months: timelineMonths,
        useCache: true,
      });
      
      return finalData;
    }
    
    // If synchronous, return immediately
    return initialResponse;
    
  } catch (error) {
    // Error handling same as Example 1
    throw error;
  }
}

// Example 3: With request cancellation
export function useAnalysisWithCancellation() {
  const abortControllerRef = useRef(null);

  const loadAnalysis = async (handle, timelineMonths) => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await requestStockAnalysis(handle, {
        months: timelineMonths,
      });
      
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return null;
      }
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { loadAnalysis };
}

// Example 4: Batch analysis for multiple handles
export async function batchAnalyzeHandles(handles) {
  const results = await Promise.allSettled(
    handles.map(handle => 
      requestStockAnalysis(handle, { months: 12, useCache: true })
    )
  );

  return results.map((result, index) => ({
    handle: handles[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
