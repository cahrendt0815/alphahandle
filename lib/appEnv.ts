// lib/appEnv.ts
// Centralized app environment config for client-side usage
// These default to local dev ports but can be overridden at build/runtime
export const MARKET_BASE_URL =
  (typeof window !== 'undefined' ? '/api/market' : undefined) ||
  process.env.NEXT_PUBLIC_MARKET_BASE_URL ||
  process.env.EXPO_PUBLIC_MARKET_BASE_URL ||
  "http://localhost:8000";

export const ANALYSIS_BASE_URL =
  (typeof window !== 'undefined' ? '/api/analysis' : undefined) ||
  process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL ||
  process.env.EXPO_PUBLIC_ANALYSIS_BASE_URL ||
  "http://localhost:8002";
