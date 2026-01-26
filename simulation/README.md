# Fintwit Performance - Simulation Pipeline

Local simulation pipeline for testing the LLM extraction flow with CSV tweet data.

## Overview

This pipeline allows you to test the complete extraction → normalization → aggregation → database upload flow using local CSV files, without needing to connect to the Twitter API.

## Directory Structure

```
fintwit-performance/
├── data/
│   └── tweets_abc_sample.csv       # Input: 50 sample tweets from @abc
├── out/
│   ├── extractions.jsonl           # Output: Raw LLM extractions
│   └── normalized_recommendations.jsonl # Output: Normalized, flattened data
├── simulation/
│   ├── extract.js                  # Extract tickers/stance from tweets
│   ├── normalize.js                # Normalize extractions to flat structure
│   └── load.js                     # Aggregate metrics and upload to Supabase
```

## Scripts

### `npm run sim:extract`
Runs the extraction and normalization pipeline:
1. Reads `data/tweets_abc_sample.csv`
2. Extracts tickers ($SYMBOL), stance (long/short), and prices using regex (or LLM if API key configured)
3. Writes raw extractions to `out/extractions.jsonl`
4. Normalizes extractions and writes to `out/normalized_recommendations.jsonl`

### `npm run sim:load`
Loads normalized data into Supabase:
1. Reads `out/normalized_recommendations.jsonl`
2. Simulates stock returns for each ticker
3. Calculates aggregate metrics (accuracy, win rate, avg return, etc.)
4. Upserts analysis for handle `@abc` into the `analyses` table

### `npm run sim:all`
Runs the complete pipeline: `sim:extract && sim:load`

## Usage

### 1. Add Your Tweet Data

Place your CSV file in the `data/` folder with the following format:

```csv
tweet_id,created_at,text,user_handle
1,2024-01-15T10:30:00Z,"Just went long $TSLA at 245. EV revolution!",abc
2,2024-01-18T14:22:00Z,"Shorting $NVDA at 495. Overvalued.",abc
```

Required columns:
- `tweet_id` - Unique identifier
- `created_at` - ISO timestamp
- `text` - Tweet content (should contain $TICKERS and long/short signals)
- `user_handle` - Twitter handle (use `abc` for this simulation)

### 2. Run the Pipeline

```bash
npm run sim:all
```

This will:
- ✅ Extract 50 ticker mentions from tweets
- ✅ Normalize to structured recommendations
- ✅ Calculate performance metrics (65.3% accuracy, 7.8% avg return, 79.6% win rate)
- ✅ Upload to Supabase `analyses` table

### 3. View in Your App

Navigate to your app and search for `@abc` - you'll see the simulated analysis data!

## How It Works

### Extraction (extract.js)

The extractor uses **regex by default** to detect:
- **Tickers**: `$SYMBOL` pattern (1-5 uppercase letters)
- **Stance**: Keywords like "long", "short", "buying", "shorting"
- **Entry price**: Patterns like "at 245" or "at $495"

For each tweet, it creates extraction objects:
```json
{
  "tweet_id": "1",
  "created_at": "2024-01-15T10:30:00Z",
  "user_handle": "abc",
  "text": "Just went long $TSLA at 245...",
  "extractions": [
    {
      "ticker": "TSLA",
      "stance": "long",
      "entry_price": 245,
      "confidence": 0.8
    }
  ]
}
```

**LLM Integration (Optional)**:
To use an actual LLM (OpenAI/Anthropic), set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in `.env` and modify the `llmExtract()` function in `extract.js`.

### Normalization (normalize.js)

Flattens nested extractions into one record per ticker:
```json
{
  "tweet_id": "1",
  "created_at": "2024-01-15T10:30:00Z",
  "user_handle": "abc",
  "ticker": "TSLA",
  "stance": "long",
  "entry_price": 245,
  "confidence": 0.8,
  "mentioned_at": "2024-01-15T10:30:00Z"
}
```

### Aggregation & Load (load.js)

1. **Groups by ticker**: Finds first mention of each ticker
2. **Simulates returns**: Generates random price movements (for testing)
3. **Calculates metrics**:
   - **Accuracy**: % of correct calls (long + positive return OR short + negative return)
   - **Win rate**: % of profitable trades
   - **Avg return**: Mean % return across all trades
   - **Best/Worst trades**: Highest and lowest performing trades
4. **Upserts to Supabase**: Updates the `analyses` table with handle `abc`

## Output Example

After running `npm run sim:all`, you'll see:

```
[Load] ✅ Successfully upserted to Supabase
[Load] Handle: abc
[Load] Total calls: 49
[Load] Accuracy: 65.3%
[Load] Avg return: 7.8%
[Load] Win rate: 79.6%
```

## Customization

### Change the Handle

Edit `simulation/load.js`:
```javascript
const HANDLE = 'abc'; // Change to any handle you want
```

### Use Real Market Data

Replace the `simulateReturns()` function in `load.js` with actual API calls to fetch historical prices (e.g., Alpha Vantage, Yahoo Finance, etc.).

### Add More Tweets

Just add more rows to `data/tweets_abc_sample.csv` and re-run `npm run sim:all`.

## Troubleshooting

### "EXPO_PUBLIC_SUPABASE_URL must be set"
Make sure your `.env` file contains:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### "Cannot find module 'csv-parse'"
Run: `npm install`

### No data appears in app
1. Check that the Supabase upsert succeeded (look for ✅ in the console)
2. Verify the handle matches (default is `@abc`)
3. Check your `analyses` table in Supabase directly

## Next Steps

- **Real LLM Integration**: Add OpenAI/Anthropic API calls to `extract.js`
- **Real Market Data**: Replace `simulateReturns()` with actual price lookups
- **Batch Processing**: Process larger CSV files with 1000s of tweets
- **Multiple Handles**: Simulate data for different Twitter accounts

---

**Happy testing! 🚀**
