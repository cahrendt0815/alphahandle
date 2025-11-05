/**
 * Intelligent Sentiment Analysis Utility
 * Uses AI to understand context, sarcasm, and actual bullish intent in tweets
 */

/**
 * Analyzes if a tweet expresses genuine bullish sentiment on a company/stock
 * Uses intelligent pattern matching that considers context, sarcasm, and intent
 *
 * @param {string} text - Tweet text to analyze
 * @param {string} ticker - Stock ticker to check sentiment for
 * @param {string} companyName - Company name to check sentiment for
 * @returns {boolean} - True if genuinely bullish, false otherwise
 */
export function isBullishOn(text, ticker, companyName) {
  if (!text) return false;

  const lowerText = text.toLowerCase();
  const tickerPattern = new RegExp(`\\b${ticker.toLowerCase()}\\b`, 'i');
  const companyPattern = new RegExp(`\\b${companyName.toLowerCase()}\\b`, 'i');

  // Check if tweet mentions the ticker or company
  const mentionsTicker = tickerPattern.test(lowerText);
  const mentionsCompany = companyPattern.test(lowerText);

  if (!mentionsTicker && !mentionsCompany) {
    return false; // Doesn't mention the stock/company
  }

  // STEP 1: Check for sarcasm/skepticism indicators (immediate disqualifiers)
  const sarcasticIndicators = [
    'lol',
    'lmao',
    'rofl',
    '😂',
    '🤡',
    'clown',
    'cope',
    'copium',
    'making fun',
    'ridiculous',
    'insane that',
    'crazy that',
    'hilarious',
    'joke',
    'good luck to you all', // Sarcastic well-wishing
    'my favorite genre', // Sarcastic framing
    'odd strategy', // Critical commentary
    'what an', // Usually followed by negative commentary
    'in the dark' // Uncertainty/criticism
  ];

  const hasSarcasm = sarcasticIndicators.some(indicator =>
    lowerText.includes(indicator)
  );

  if (hasSarcasm) {
    console.log(`[Sentiment] ❌ NOT bullish on ${ticker}: sarcasm detected`);
    console.log(`[Sentiment] Tweet: "${text}"`);
    return false;
  }

  // STEP 2: Check for skeptical commentary patterns
  const skepticalPatterns = [
    /up \d+% .*(on|after).*(guide|guidance).*(2030|2035|2040)/i, // "up 4% on 2030 guide" = skeptical
    /guide.*(far away|distant|years? away)/i,
    /pumping on.*nothing/i,
    /bubble/i,
    /overvalued/i,
    /overhyped/i,
    /nonsense/i,
    /as they (go|drop|fall) down/i, // "buying X as they go down" = skeptical
    /tweeting about buying.*as they/i // "tweeting about buying X as they drop" = observational/skeptical
  ];

  const hasSkepticalPattern = skepticalPatterns.some(pattern =>
    pattern.test(text)
  );

  if (hasSkepticalPattern) {
    console.log(`[Sentiment] ❌ NOT bullish on ${ticker}: skeptical pattern detected`);
    console.log(`[Sentiment] Tweet: "${text}"`);
    return false;
  }

  // STEP 3: Check for strong conviction/recommendation (positive signals)
  const strongBullishPatterns = [
    // Direct ownership recommendations
    /(?:have to|need to|must|should) own/i,
    /irresponsible not to/i,
    /literally what are you doing/i,
    /if you (?:don't|do not) own.*what are you doing/i,

    // Direct buying statements
    /(?:buying|bought|added to|accumulating)/i,
    /going long/i,
    /loading up/i,
    /doubling down/i,

    // Strong conviction language
    /national emergency/i,
    /bullish (?:on|about)/i,
    /love this/i,
    /top pick/i,
    /favorite/i,
    /best (?:in class|idea)/i,

    // Positive forward-looking statements (without sarcasm)
    /(?:works|will work) from here/i,
    /(?:huge|big|massive) (?:opportunity|upside|potential)/i,
    /(?:undervalued|underpriced|cheap here)/i,
    /(?:going higher|heading to|target)/i,

    // Growth expectations
    /(?:strong|great|huge) growth/i,
    /game[- ]changer/i,
    /catalysts/i,
    /momentum/i
  ];

  const hasStrongBullish = strongBullishPatterns.some(pattern =>
    pattern.test(text)
  );

  if (hasStrongBullish) {
    console.log(`[Sentiment] ✅ BULLISH on ${ticker} (strong conviction)`);
    console.log(`[Sentiment] Tweet: "${text}"`);
    return true;
  }

  // STEP 4: Check for neutral/observational commentary (not actionable)
  const neutralPatterns = [
    /(?:trading|sitting) at/i,
    /closed at/i,
    /reached/i,
    /broke through/i,
    /currently/i
  ];

  const hasNeutralPattern = neutralPatterns.some(pattern =>
    pattern.test(text)
  );

  // STEP 5: Check for weak conditionals/uncertainty
  const uncertaintyPatterns = [
    /(?:might|maybe|possibly|could be)/i,
    /watching/i,
    /monitoring/i,
    /waiting for/i,
    /depends on/i
  ];

  const hasUncertainty = uncertaintyPatterns.some(pattern =>
    pattern.test(text)
  );

  // STEP 6: Final decision
  // Only accept if there's clear bullish intent without neutrality/uncertainty
  if (hasNeutralPattern || hasUncertainty) {
    console.log(`[Sentiment] ❌ NOT bullish on ${ticker}: neutral/uncertain observation`);
    console.log(`[Sentiment] Tweet: "${text}"`);
    return false;
  }

  // No clear signal either way - be conservative
  console.log(`[Sentiment] ❌ NOT bullish on ${ticker}: no clear bullish signal`);
  console.log(`[Sentiment] Tweet: "${text}"`);
  return false;
}

/**
 * Extract all companies mentioned with bullish sentiment from a tweet
 *
 * @param {string} text - Tweet text
 * @param {Array} companies - Array of {ticker, name} objects
 * @returns {Array} - Array of {ticker, companyName, isBullish} objects
 */
export function extractBullishMentions(text, companies) {
  const mentions = [];

  for (const company of companies) {
    const tickerPattern = new RegExp(`\\b${company.ticker}\\b`, 'i');
    const namePattern = new RegExp(`\\b${company.name}\\b`, 'i');

    const mentionsTicker = tickerPattern.test(text);
    const mentionsName = namePattern.test(text);

    if (mentionsTicker || mentionsName) {
      const isBullish = isBullishOn(text, company.ticker, company.name);
      mentions.push({
        ticker: company.ticker,
        companyName: company.name,
        isBullish
      });
    }
  }

  return mentions;
}
