/**
 * Stock Mention Prefilter
 *
 * Detects stock mentions in tweets using:
 * - $TICKER format (e.g., $AAPL)
 * - Whole-word ticker symbols (e.g., AAPL)
 * - Simplified company names (e.g., Amazon, Danaher)
 *
 * Uses SEC company tickers from Supabase Storage
 */

const COMPANY_TICKERS_URL =
  process.env.EXPO_PUBLIC_COMPANY_TICKERS_URL ||
  "https://vjapeusemdciohsvnelx.supabase.co/storage/v1/object/sign/SEC_Company_Dataset/company_tickers.json?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MGFjOWExYi1lMDQ5LTQ3YWMtOTFiYy1mNTBkNmQwZmZhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJTRUNfQ29tcGFueV9EYXRhc2V0L2NvbXBhbnlfdGlja2Vycy5qc29uIiwiaWF0IjoxNzYyMzc2NDYwLCJleHAiOjE3OTM5MTI0NjB9.X1mioGFEwoV88cB52udqaxuNg8DuBvq7-g1CeEAxjYU";

/**
 * Load company tickers from Supabase Storage
 */
export async function loadCompanyTickers() {
  try {
    const response = await fetch(COMPANY_TICKERS_URL);
    if (!response.ok) throw new Error(`Failed to fetch company tickers: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("Error loading company tickers:", err);
    return {};
  }
}

export interface Company {
  ticker: string;
  name: string;
  cleanName: string;
}

interface SECCompanyData {
  cik_str: number;
  ticker: string;
  title: string;
}

/**
 * Clean company name by removing suffixes and state designations
 */
function cleanCompanyName(title: string): string {
  let cleaned = title.trim().toUpperCase();

  // First, remove state designations with slashes (special handling without word boundaries)
  const stateDesignations = ['/DE/', '/PA/', '/MD/', '/NV/', '/CA/', '/TX/', '/NY/', '/FL/'];
  for (const state of stateDesignations) {
    // Escape slashes and replace without word boundaries
    const escaped = state.replace(/\//g, '\/');
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '');
  }

  // Then remove other suffixes with word boundaries
  // Pattern matches: optional comma/space before + suffix + optional period after
  const otherSuffixes = [
    'CORPORATION', 'INCORPORATED', 'COMPANY', 'HOLDINGS', 'PLATFORMS',  // Longer words first
    'CORP', 'INC', 'COM', 'LLC', 'LTD', 'LIMITED',
    'PLC', 'CO', 'LP', 'L\\.P\\.', 'GROUP',
    'SA', 'AG', 'NV', 'BV', 'SE'
  ];

  for (const suffix of otherSuffixes) {
    // Match comma/spaces before suffix + the suffix itself + optional period
    const regex = new RegExp(`[,\\s]+\\b${suffix}\\b\\.?|\\b${suffix}\\b\\.?`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  // Remove extra whitespace and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[,.\-\s]+$/, '');

  return cleaned;
}

/**
 * Load companies from Supabase Storage
 */
export async function loadCompanies(): Promise<Company[]> {
  const companyTickersData = await loadCompanyTickers();
  const secData: Record<string, SECCompanyData> = companyTickersData as any;

  const companies: Company[] = [];

  for (const key in secData) {
    const entry = secData[key];
    const cleanName = cleanCompanyName(entry.title);

    // Only add if we have a meaningful clean name (not just numbers or single letters)
    if (cleanName && cleanName.length > 1 && !/^\d+$/.test(cleanName)) {
      companies.push({
        ticker: entry.ticker.toUpperCase(),
        name: entry.title,
        cleanName: cleanName
      });
    }
  }

  console.log(`[Prefilter] Loaded ${companies.length} companies`);
  return companies;
}

/**
 * Find the first matching company in a tweet
 * Returns the company object if found, null otherwise
 */
export function findMatchingCompany(text: string, companies: Company[]): Company | null {
  const upperText = text.toUpperCase();

  for (const company of companies) {
    const ticker = company.ticker;
    const cleanName = company.cleanName;

    // Check for $TICKER format
    const dollarTickerRegex = new RegExp(`\\$${ticker}\\b`, 'i');
    if (dollarTickerRegex.test(text)) {
      return company;
    }

    // Check for whole-word ticker (skip single-letter tickers to avoid false positives)
    if (ticker.length > 1) {
      const wholeWordTickerRegex = new RegExp(`\\b${ticker}\\b`, 'i');
      if (wholeWordTickerRegex.test(upperText)) {
        return company;
      }
    }

    // Check for company name
    if (cleanName.length >= 4 && !isCommonWord(cleanName)) {
      const nameRegex = new RegExp(`\\b${escapeRegex(cleanName)}('S)?\\b`, 'i');
      if (nameRegex.test(upperText)) {
        return company;
      }
    }
  }

  return null;
}

/**
 * Check if text contains a stock signal
 *
 * Matches:
 * - $TICKER (e.g., $AAPL)
 * - Whole-word TICKER (e.g., "Buy AAPL")
 * - Company name (e.g., "Love Amazon's growth")
 *
 * Does NOT match:
 * - Ticker as substring (e.g., "AMZNFT" should not match AMZN)
 * - Common words like "com", "inc", "corp"
 */
export async function containsStockSignal(
  text: string,
  companies: Company[]
): Promise<boolean> {
  const upperText = text.toUpperCase();

  // Debug logging for first few checks
  const isDebugTweet = text.toLowerCase().includes('salesforce') || text.toLowerCase().includes('crm');
  if (isDebugTweet) {
    console.log('[Prefilter DEBUG] Checking tweet:', text.substring(0, 100));
  }

  for (const company of companies) {
    const ticker = company.ticker;
    const cleanName = company.cleanName;

    // Check for $TICKER format
    const dollarTickerRegex = new RegExp(`\\$${ticker}\\b`, 'i');
    if (dollarTickerRegex.test(text)) {
      if (isDebugTweet) console.log('[Prefilter DEBUG] Matched $TICKER:', ticker);
      return true;
    }

    // Check for whole-word ticker (must be surrounded by word boundaries)
    // This prevents matching AMZN in AMZNFT
    // Skip single-letter tickers to avoid false positives (e.g., "T" matching "the")
    if (ticker.length > 1) {
      const wholeWordTickerRegex = new RegExp(`\b${ticker}\b`, 'i');
      if (wholeWordTickerRegex.test(upperText)) {
        if (isDebugTweet) console.log('[Prefilter DEBUG] Matched whole-word ticker:', ticker);
        return true;
      }
    }

    // Check for company name (whole word match)
    // Skip very short or common names to avoid false positives
    if (cleanName.length >= 4 && !isCommonWord(cleanName)) {
      // Match the name with optional possessive ('s)
      const nameRegex = new RegExp(`\\b${escapeRegex(cleanName)}('S)?\\b`, 'i');
      if (nameRegex.test(upperText)) {
        if (isDebugTweet) console.log('[Prefilter DEBUG] Matched company name:', cleanName, 'from', company.name);
        return true;
      }

      // Extra debug for Salesforce specifically
      if (isDebugTweet && (ticker === 'CRM' || cleanName.includes('SALESFORCE'))) {
        console.log('[Prefilter DEBUG] Checking Salesforce:');
        console.log('  - Ticker:', ticker);
        console.log('  - Original name:', company.name);
        console.log('  - Clean name:', cleanName);
        console.log('  - Clean name length:', cleanName.length);
        console.log('  - Is common word?', isCommonWord(cleanName));
        console.log('  - Regex pattern:', nameRegex.toString());
        console.log('  - Test result:', nameRegex.test(upperText));
      }
    }
  }

  if (isDebugTweet) {
    console.log('[Prefilter DEBUG] No match found for tweet');
  }

  return false;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  // Simple character-by-character escaping
  let result = '';
  for (const char of str) {
    if ('.*+?^${}()|[]\\'.includes(char)) {
      result += '\\' + char;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Check if a word is too common to be a reliable company indicator
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    'CORP', 'INC', 'COM', 'LLC', 'LTD', 'CO',
    'THE', 'AND', 'FOR', 'GROUP', 'HOLDINGS',
    'CAPITAL', 'FINANCIAL', 'SERVICES', 'BANK'
  ];
  return commonWords.includes(word.toUpperCase());
}

/**
 * Test function - run with: npx tsx api/prefilter.ts
 */
async function runTests() {
  console.log('🧪 Testing Stock Mention Prefilter\n');

  // Load companies
  const companies = await loadCompanies();
  console.log(`Loaded ${companies.length} companies\n`);

  // Print first 20 companies to verify data
  console.log('First 20 companies:');
  companies.slice(0, 20).forEach(c => {
    console.log(`  ${c.ticker} - ${c.name} → "${c.cleanName}"`);
  });
  // Test cases
  console.log();
  const testCases = [
    { text: '$AMZN going to the moon', expected: true },
    { text: 'Long AMZN today', expected: true },
    { text: "Love Danaher's growth", expected: true },
    { text: '$AAPL is my favorite stock', expected: true },
    { text: 'Bought NVDA at $500', expected: true },
    { text: 'Tesla earnings coming up', expected: true },
    { text: 'AMZNFT hype train', expected: false },
    { text: 'com inc corp', expected: false },
    { text: 'Just some random text', expected: false },
    { text: 'Microsoft announced new product', expected: true },
    { text: 'Apple released iPhone 15', expected: true },
    { text: 'Netflix subscriptions up', expected: true }
  ];

  console.log('Running test cases:\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await containsStockSignal(testCase.text, companies);
    const status = result === testCase.expected ? '✅' : '❌';
    const match = result ? 'MATCH' : 'NO MATCH';

    console.log(`${status} "${testCase.text}"`);
    console.log(`   Expected: ${testCase.expected ? 'MATCH' : 'NO MATCH'}, Got: ${match}`);

    if (result === testCase.expected) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  }
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests().catch(console.error);
}
