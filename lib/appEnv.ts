// lib/appEnv.ts
// Centralized app environment config for client-side usage

// Stock Analysis API URL (for external analyst API endpoint)
// Set EXPO_PUBLIC_STOCK_ANALYSIS_API_URL in .env
export const STOCK_ANALYSIS_API_URL = process.env.EXPO_PUBLIC_STOCK_ANALYSIS_API_URL || process.env.STOCK_ANALYSIS_API_URL || "https://api.yourdomain.com/v1";
