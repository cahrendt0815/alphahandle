/**
 * normalize.js - Normalize extractions into structured recommendations
 * Reads extractions.jsonl, flattens to normalized_recommendations.jsonl
 */

const fs = require('fs');
const path = require('path');

const INPUT_EXTRACTIONS = path.join(__dirname, '../out/extractions.jsonl');
const OUTPUT_NORMALIZED = path.join(__dirname, '../out/normalized_recommendations.jsonl');

/**
 * Normalize a single extraction entry into flat recommendation records
 */
function normalizeExtraction(entry) {
  const recommendations = [];

  for (const extraction of entry.extractions) {
    const rec = {
      // Tweet metadata
      tweet_id: entry.tweet_id,
      created_at: entry.created_at,
      user_handle: entry.user_handle,
      text: entry.text,

      // Extraction data
      ticker: extraction.ticker,
      stance: extraction.stance,
      entry_price: extraction.entry_price,
      confidence: extraction.confidence,

      // Normalized timestamp
      mentioned_at: entry.created_at,
      normalized_at: new Date().toISOString(),
    };

    recommendations.push(rec);
  }

  return recommendations;
}

/**
 * Main normalization pipeline
 */
function main() {
  console.log('[Normalize] Reading extractions:', INPUT_EXTRACTIONS);

  if (!fs.existsSync(INPUT_EXTRACTIONS)) {
    console.error('[Normalize] ❌ Error: extractions.jsonl not found. Run sim:extract first.');
    process.exit(1);
  }

  // Read JSONL file (one JSON object per line)
  const lines = fs.readFileSync(INPUT_EXTRACTIONS, 'utf-8')
    .split('\n')
    .filter(line => line.trim());

  const extractions = lines.map(line => JSON.parse(line));
  console.log(`[Normalize] Found ${extractions.length} extraction entries`);

  // Clear previous output
  if (fs.existsSync(OUTPUT_NORMALIZED)) {
    fs.unlinkSync(OUTPUT_NORMALIZED);
  }

  let totalRecommendations = 0;

  // Normalize each extraction entry
  for (const entry of extractions) {
    const recommendations = normalizeExtraction(entry);

    // Write each recommendation to JSONL
    for (const rec of recommendations) {
      fs.appendFileSync(OUTPUT_NORMALIZED, JSON.stringify(rec) + '\n');
      totalRecommendations++;
    }
  }

  console.log(`[Normalize] ✅ Complete! Total recommendations: ${totalRecommendations}`);
  console.log(`[Normalize] Output: ${OUTPUT_NORMALIZED}`);
}

// Run normalization
main();
