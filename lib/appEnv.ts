// lib/appEnv.ts
// Centralized app environment config for client-side usage
// On Vercel (production/staging), use relative paths to serverless functions
// Locally, use localhost URLs

const isVercel = typeof window !== 'undefined' && 
  (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

// For Vercel deployments, always use relative paths to serverless functions
// For local dev, use localhost URLs
export const MARKET_BASE_URL = isVercel
  ? '/api/market'
  : (process.env.NEXT_PUBLIC_MARKET_BASE_URL ||
     process.env.EXPO_PUBLIC_MARKET_BASE_URL ||
     "http://localhost:8000");

export const ANALYSIS_BASE_URL = isVercel
  ? '/api/analysis'
  : (process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL ||
     process.env.EXPO_PUBLIC_ANALYSIS_BASE_URL ||
     "http://localhost:8002");
