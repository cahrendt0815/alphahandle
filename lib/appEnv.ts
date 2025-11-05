// lib/appEnv.ts
// Centralized app environment config for client-side usage
// These default to local dev ports but can be overridden at build/runtime
export const MARKET_BASE_URL = process.env.MARKET_BASE_URL || "http://localhost:8000";
export const ANALYSIS_BASE_URL = process.env.ANALYSIS_BASE_URL || "http://localhost:8002";
