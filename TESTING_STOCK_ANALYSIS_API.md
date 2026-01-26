# Testing the Stock Analysis API Endpoint

This guide shows you how to test the data analyst's API endpoint to verify it returns the expected response structure.

## Expected Response Structure

Based on the API specification, the endpoint should return an array of objects with this structure:

```json
[
  {
    "id": "2000856993926668547",
    "url": "https://x.com/rubicon59/status/2000856993926668547",
    "created_at": "2025-12-16",
    "cashtag": ["$NXSN", "$ATH"],
    "text": "When you sit by the river long enough, $NXSN will hit an ATH...",
    "begin": 0,
    "return": 0,
    "last": 0,
    "alpha": 0
  }
]
```

**Note:** The `begin`, `return`, `last`, and `alpha` fields are currently always `0` until the API is fully implemented.

## Testing Methods

### Method 1: Command Line Script (Recommended)

Use the Node.js test script for quick testing:

```bash
# Basic usage
node scripts/test-stock-analysis-api.js <endpoint-url> [handle]

# Examples
node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59
node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59 --months=6
node scripts/test-stock-analysis-api.js https://api.example.com/analyze @elonmusk --months=12
```

**What it does:**
- ✅ Makes a GET request to the endpoint
- ✅ Validates the response structure
- ✅ Checks all required fields are present
- ✅ Verifies data types are correct
- ✅ Shows sample response data
- ✅ Provides summary statistics

**Output example:**
```
🧪 Testing Stock Analysis API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Endpoint: https://api.example.com/analyze?handle=rubicon59&months=12
👤 Handle: @rubicon59
📅 Months: 12
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Making request...

📊 Response Status: 200 OK
⏱️  Response Time: 1170ms
📦 Content-Type: application/json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Request successful!

🔍 Validating response structure...

📈 Found 2 items in response

✅ All items have valid structure!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Sample Response Data:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

First item:
{
  "id": "2000856993926668547",
  "url": "https://x.com/rubicon59/status/2000856993926668547",
  "created_at": "2025-12-16",
  "cashtag": ["$NXSN", "$ATH"],
  "text": "When you sit by the river long enough...",
  "begin": 0,
  "return": 0,
  "last": 0,
  "alpha": 0
}

... and 1 more item(s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total items: 2
Valid items: 2
Invalid items: 0

⚠️  Note: All items have begin=0, return=0, last=0, alpha=0
   (This is expected if the API is not yet calculating these values)
Unique stock tickers: 3
Tickers: $NXSN, $ATH, $ZOMD

✅ Test completed successfully!
```

### Method 2: In-App Test Screen

Access the test screen directly in your app:

1. **Navigate to the test screen:**
   - In development: `http://localhost:8081/test-api`
   - Or add a button in your Portal to navigate to it

2. **Enter the endpoint URL** from your data analyst

3. **Enter a Twitter handle** to test (e.g., `@rubicon59`)

4. **Click "Test Endpoint"**

The screen will:
- ✅ Make the API request
- ✅ Validate the response structure
- ✅ Show validation results
- ✅ Display the response data
- ✅ Highlight any issues found

### Method 3: Using Postman/Insomnia

1. **Create a new GET request**
2. **Enter the endpoint URL** (e.g., `https://api.example.com/analyze`)
3. **Add query parameters:**
   - `handle`: `rubicon59` (or any Twitter handle)
   - `months`: `12` (optional)
4. **Send the request**
5. **Verify the response:**
   - Status should be `200 OK`
   - Response should be a JSON array
   - Each item should have: `id`, `url`, `created_at`, `cashtag`, `text`, `begin`, `return`, `last`, `alpha`

### Method 4: Using curl

```bash
# Basic request
curl "https://api.example.com/analyze?handle=rubicon59&months=12"

# With pretty printing
curl "https://api.example.com/analyze?handle=rubicon59&months=12" | jq

# Save response to file
curl "https://api.example.com/analyze?handle=rubicon59&months=12" > response.json
```

## Validation Checklist

When testing, verify:

- [ ] **HTTP Status:** Should be `200 OK`
- [ ] **Content-Type:** Should be `application/json`
- [ ] **Response Format:** Should be an array `[]`
- [ ] **Required Fields:** Each item must have:
  - [ ] `id` (string)
  - [ ] `url` (string)
  - [ ] `created_at` (string, date format)
  - [ ] `cashtag` (array of strings)
  - [ ] `text` (string)
  - [ ] `begin` (number, currently 0)
  - [ ] `return` (number, currently 0)
  - [ ] `last` (number, currently 0)
  - [ ] `alpha` (number, currently 0)
- [ ] **Data Types:** All fields have correct types
- [ ] **URL Format:** `url` field should be a valid X/Twitter URL
- [ ] **Cashtags:** `cashtag` array should contain stock tickers with `$` prefix

## Common Issues & Solutions

### Issue: "Response is not an array"
**Solution:** The API might be returning a single object instead of an array. Check with your data analyst.

### Issue: "Missing fields"
**Solution:** Verify the API endpoint is returning all required fields. Check the API documentation.

### Issue: "Network Error" or "Failed to fetch"
**Solutions:**
- Check if the endpoint URL is correct
- Verify your internet connection
- Check if the API server is running
- Verify CORS settings if testing from browser
- Check if authentication is required (API key/token)

### Issue: "Timeout"
**Solutions:**
- The API might be slow. Increase timeout in the test script
- Check if the API is processing the request (might be async)

### Issue: "401 Unauthorized" or "403 Forbidden"
**Solutions:**
- Check if authentication is required
- Verify API key/token is set correctly
- Check if the API key has proper permissions

## Next Steps

Once the API is tested and working:

1. **Update environment variables:**
   ```env
   EXPO_PUBLIC_STOCK_ANALYSIS_API_URL=https://api.example.com
   EXPO_PUBLIC_STOCK_ANALYSIS_API_TOKEN=your_token_here
   ```

2. **Update the API client** in `services/stockAnalysisApiClient.js` to use the correct endpoint URL

3. **Replace dummy data** in `screens/PortalScreen.js` with real API calls

4. **Test integration** in the actual app flow

## Example Test Commands

```bash
# Test with default handle
node scripts/test-stock-analysis-api.js https://api.example.com/analyze

# Test with specific handle
node scripts/test-stock-analysis-api.js https://api.example.com/analyze @elonmusk

# Test with custom months
node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59 --months=6

# Test with date range (if supported)
node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59 --since=2025-01-01 --until=2025-01-31
```

## Need Help?

If you encounter issues:
1. Check the error message in the test output
2. Verify the endpoint URL is correct
3. Test with a simple curl command first
4. Contact your data analyst with the error details
