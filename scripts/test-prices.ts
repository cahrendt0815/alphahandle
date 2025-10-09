// scripts/test-prices.ts
import { batchFetchPrices, getDividends, setMarketBaseUrl } from "../lib/marketClient";

async function main() {
  const base = process.env.MARKET_BASE_URL || "http://localhost:8000";
  setMarketBaseUrl(base);
  console.log("Testing market API at:", base);

  const tweetTimestamp = "2024-08-15T14:23:00Z";
  const requests = [
    { symbol: "AAPL", type: "entry" as const, tweetTimestamp },
    { symbol: "AAPL", type: "latest" as const },
    { symbol: "SPY",  type: "entry" as const, tweetTimestamp },
    { symbol: "SPY",  type: "latest" as const },
  ];

  const prices = await batchFetchPrices(requests);
  console.log("Prices:", JSON.stringify(prices, null, 2));

  const dividends = await getDividends("AAPL", "5y");
  console.log("Dividends (AAPL):", dividends.slice(-5));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
