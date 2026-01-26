/**
 * extract.js - LLM-based ticker extraction with regex fallback
 * Reads tweets CSV, extracts tickers/stance/metrics, writes to JSONL
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const INPUT_CSV = path.join(__dirname, '../data/tweets_abc_sample.csv');
const OUTPUT_EXTRACTIONS = path.join(__dirname, '../out/extractions.jsonl');

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_EXTRACTIONS);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

/**
 * Regex-based extractor (fallback when no LLM API key)
 * Detects tickers ($SYMBOL), stance (long/short), and basic metrics
 */
function regexExtract(text) {
  const results = [];

  // Extract tickers: $SYMBOL pattern (1-5 uppercase letters)
  const tickerPattern = /\$([A-Z]{1,5})\b/g;
  const tickers = [...text.matchAll(tickerPattern)].map(m => m[1]);

  // Detect stance: look for long/short keywords
  const textLower = text.toLowerCase();
  let stance = 'long'; // default

  if (textLower.includes('short') || textLower.includes('shorting')) {
    stance = 'short';
  } else if (textLower.includes('long') || textLower.includes('buying') ||
             textLower.includes('entered') || textLower.includes('buy')) {
    stance = 'long';
  }

  // Extract price if mentioned (e.g., "at 245", "at $495")
  const pricePattern = /(?:at|@)\s*\$?(\d+(?:\.\d{1,2})?)/i;
  const priceMatch = text.match(pricePattern);
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;

  // Create extraction for each ticker found
  for (const ticker of tickers) {
    results.push({
      ticker,
      stance,
      entry_price: price,
      confidence: 0.8, // regex confidence is lower than LLM
    });
  }

  return results;
}

/**
 * LLM-based extractor (placeholder for OpenAI/Anthropic API)
 * For now, falls back to regex
 */
async function llmExtract(text) {
  // TODO: Implement actual LLM call if API key is available
  // const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  // if (apiKey) { ... call LLM ... }

  // Fallback to regex for now
  return regexExtract(text);
}

/**
 * Main extraction pipeline
 */
async function main() {
  console.log('[Extract] Reading CSV:', INPUT_CSV);

  // Read and parse CSV
  const csvContent = fs.readFileSync(INPUT_CSV, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`[Extract] Found ${records.length} tweets`);

  // Clear previous output
  if (fs.existsSync(OUTPUT_EXTRACTIONS)) {
    fs.unlinkSync(OUTPUT_EXTRACTIONS);
  }

  let totalExtractions = 0;

  // Process tweets in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    console.log(`[Extract] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`);

    const batchResults = [];

    for (const record of batch) {
      const extractions = await llmExtract(record.text);

      // Write extraction result
      const extractionEntry = {
        tweet_id: record.tweet_id,
        created_at: record.created_at,
        user_handle: record.user_handle,
        text: record.text,
        extractions,
        extracted_at: new Date().toISOString(),
      };

      batchResults.push(extractionEntry);
      totalExtractions += extractions.length;

      // Write to JSONL (one JSON object per line)
      fs.appendFileSync(OUTPUT_EXTRACTIONS, JSON.stringify(extractionEntry) + '\n');
    }

    console.log(`[Extract] Batch complete: ${batchResults.length} tweets, ${batchResults.reduce((sum, r) => sum + r.extractions.length, 0)} extractions`);
  }

  console.log(`[Extract] ✅ Complete! Total extractions: ${totalExtractions}`);
  console.log(`[Extract] Output: ${OUTPUT_EXTRACTIONS}`);
}

// Run extraction
main().catch(err => {
  console.error('[Extract] ❌ Error:', err);
  process.exit(1);
});
