// lib/appEnv.ts
// Centralized app environment config for client-side usage
// On Vercel (production/staging), use relative paths to serverless functions
// Locally, use localhost URLs

// Runtime check for Vercel deployment (not localhost)
function isVercelDeployment(): boolean {
  if (typeof window === 'undefined') {
    console.log('[appEnv] window is undefined, assuming server-side');
    return false;
  }
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname === '[::1]' ||
                  hostname.startsWith('192.168.') ||
                  hostname.startsWith('10.') ||
                  hostname.endsWith('.local');
  
  const isVercel = !isLocal;
  console.log(`[appEnv] hostname: ${hostname}, isLocal: ${isLocal}, isVercel: ${isVercel}`);
  return isVercel;
}

// Get base URLs - use runtime check for accurate detection
function getMarketBaseUrl(): string {
  const isVercel = isVercelDeployment();
  
  // On Vercel, always use relative paths (ignore localhost env vars)
  if (isVercel) {
    console.log('[appEnv] On Vercel - using relative path /api/market');
    return '/api/market';
  }
  
  // Local development: check environment variables
  if (process.env.NEXT_PUBLIC_MARKET_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_MARKET_BASE_URL;
    console.log('[appEnv] Using NEXT_PUBLIC_MARKET_BASE_URL:', url);
    return url;
  }
  if (process.env.EXPO_PUBLIC_MARKET_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_MARKET_BASE_URL;
    // Ignore localhost URLs if somehow set (shouldn't happen, but safety check)
    if (url.includes('localhost')) {
      console.log('[appEnv] Ignoring localhost EXPO_PUBLIC_MARKET_BASE_URL, using default');
      return "http://localhost:8000";
    }
    console.log('[appEnv] Using EXPO_PUBLIC_MARKET_BASE_URL:', url);
    return url;
  }
  
  console.log('[appEnv] Using localhost:8000 (local dev default)');
  return "http://localhost:8000";
}

function getAnalysisBaseUrl(): string {
  const isVercel = isVercelDeployment();
  
  // On Vercel, always use relative paths (ignore localhost env vars)
  if (isVercel) {
    console.log('[appEnv] On Vercel - using relative path /api/analysis');
    return '/api/analysis';
  }
  
  // Local development: check environment variables
  if (process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL;
    console.log('[appEnv] Using NEXT_PUBLIC_ANALYSIS_BASE_URL:', url);
    return url;
  }
  if (process.env.EXPO_PUBLIC_ANALYSIS_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_ANALYSIS_BASE_URL;
    // Ignore localhost URLs if somehow set (shouldn't happen, but safety check)
    if (url.includes('localhost')) {
      console.log('[appEnv] Ignoring localhost EXPO_PUBLIC_ANALYSIS_BASE_URL, using default');
      return "http://localhost:8002";
    }
    console.log('[appEnv] Using EXPO_PUBLIC_ANALYSIS_BASE_URL:', url);
    return url;
  }
  
  console.log('[appEnv] Using localhost:8002 (local dev default)');
  return "http://localhost:8002";
}

// Calculate at module load (will be re-evaluated on each page load in browser)
// For static exports, this runs in the browser, so window.location is available
export const MARKET_BASE_URL = getMarketBaseUrl();
export const ANALYSIS_BASE_URL = getAnalysisBaseUrl();
