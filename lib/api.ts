// lib/api.ts
// Centralized API client for market data backend

const API_BASE_URL = process.env.MARKET_BASE_URL || "https://alphahandle-api2.onrender.com";

console.log("[API] Using backend:", API_BASE_URL);

// ============================================================================
// Type Definitions
// ============================================================================

export type PriceRequest = {
  symbol: string;
  type: "entry" | "latest";
  tweetTimestamp?: string; // Required for "entry" type
};

export type PriceResponse = {
  symbol: string;
  type: "entry" | "latest";
  date: string | null;
  price: number | null;
  asof: string | null;
};

export type BatchQuotesResponse = {
  data: PriceResponse[];
  errors: Array<{
    message: string;
    symbol?: string;
    type?: string;
  }>;
};

export type DividendResponse = {
  date: string;
  amount: number;
};

export type HealthResponse = {
  status: string;
  cache?: {
    hist_entries: number;
    latest_entries: number;
  };
};

// ============================================================================
// Error Handling Helper
// ============================================================================

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new APIError(
      `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      response.status,
      endpoint
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new APIError(
      `Failed to parse JSON response from ${endpoint}`,
      response.status,
      endpoint
    );
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Check API health status
 *
 * @returns Health status with optional cache stats
 */
export async function checkHealth(): Promise<HealthResponse> {
  const endpoint = `${API_BASE_URL}/api/health`;

  try {
    const response = await fetch(endpoint);
    return await handleResponse<HealthResponse>(response, endpoint);
  } catch (error) {
    console.error("[API] Health check failed:", error);
    throw error;
  }
}

/**
 * Get dividend history for a symbol
 *
 * @param symbol - Stock ticker symbol (e.g., "AAPL")
 * @param range - Time range (e.g., "5y", "1y", "6mo")
 * @returns Array of dividend records
 */
export async function getDividends(
  symbol: string,
  range: string = "5y"
): Promise<DividendResponse[]> {
  const endpoint = `${API_BASE_URL}/api/dividends?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`;

  try {
    const response = await fetch(endpoint);
    return await handleResponse<DividendResponse[]>(response, endpoint);
  } catch (error) {
    console.error(`[API] Failed to get dividends for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch batch quotes (entry and latest prices)
 *
 * @param requests - Array of price requests
 * @returns Batch quotes response with data and errors
 */
export async function getBatchQuotes(
  requests: PriceRequest[]
): Promise<BatchQuotesResponse> {
  const endpoint = `${API_BASE_URL}/api/quotes/batch`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    return await handleResponse<BatchQuotesResponse>(response, endpoint);
  } catch (error) {
    console.error("[API] Failed to fetch batch quotes:", error);
    throw error;
  }
}

/**
 * Convenience function to get entry price for a symbol
 *
 * @param symbol - Stock ticker symbol
 * @param tweetTimestamp - ISO timestamp of tweet
 * @returns Price response or null if not found
 */
export async function getEntryPrice(
  symbol: string,
  tweetTimestamp: string
): Promise<PriceResponse | null> {
  try {
    const result = await getBatchQuotes([
      { symbol, type: "entry", tweetTimestamp },
    ]);

    if (result.data.length > 0) {
      return result.data[0];
    }

    if (result.errors.length > 0) {
      console.warn(`[API] Entry price error for ${symbol}:`, result.errors[0]);
    }

    return null;
  } catch (error) {
    console.error(`[API] Failed to get entry price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Convenience function to get latest price for a symbol
 *
 * @param symbol - Stock ticker symbol
 * @returns Price response or null if not found
 */
export async function getLatestPrice(
  symbol: string
): Promise<PriceResponse | null> {
  try {
    const result = await getBatchQuotes([{ symbol, type: "latest" }]);

    if (result.data.length > 0) {
      return result.data[0];
    }

    if (result.errors.length > 0) {
      console.warn(`[API] Latest price error for ${symbol}:`, result.errors[0]);
    }

    return null;
  } catch (error) {
    console.error(`[API] Failed to get latest price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Set the API base URL (useful for switching between local and production)
 *
 * @param url - New base URL (e.g., "http://localhost:8000" or "https://api.example.com")
 */
export function setAPIBaseURL(url: string): void {
  if (typeof window !== "undefined") {
    (window as any).__API_BASE_URL = url;
    console.log("[API] Base URL updated to:", url);
  }
}

/**
 * Get the current API base URL
 */
export function getAPIBaseURL(): string {
  if (typeof window !== "undefined" && (window as any).__API_BASE_URL) {
    return (window as any).__API_BASE_URL;
  }
  return API_BASE_URL;
}
