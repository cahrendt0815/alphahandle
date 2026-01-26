/**
 * Test script for Stock Analysis API endpoint
 * 
 * Usage:
 *   node scripts/test-stock-analysis-api.js <endpoint-url> [handle] [options]
 * 
 * Examples:
 *   node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59
 *   node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59 --months=6
 */

const endpointUrl = process.argv[2];
const handle = process.argv[3] || '@rubicon59'; // Default test handle
const options = {};

// Parse additional options
for (let i = 4; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith('--months=')) {
    options.months = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--since=')) {
    options.since = arg.split('=')[1];
  } else if (arg.startsWith('--until=')) {
    options.until = arg.split('=')[1];
  }
}

if (!endpointUrl) {
  console.error('❌ Error: Endpoint URL is required');
  console.log('\nUsage:');
  console.log('  node scripts/test-stock-analysis-api.js <endpoint-url> [handle] [options]');
  console.log('\nExamples:');
  console.log('  node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59');
  console.log('  node scripts/test-stock-analysis-api.js https://api.example.com/analyze @rubicon59 --months=6');
  process.exit(1);
}

// Clean handle (remove @ if present)
const cleanHandle = handle.replace(/^@/, '');

// Build URL with query parameters
const url = new URL(endpointUrl);
url.searchParams.set('handle', cleanHandle);
if (options.months) url.searchParams.set('months', options.months.toString());
if (options.since) url.searchParams.set('since', options.since);
if (options.until) url.searchParams.set('until', options.until);

console.log('🧪 Testing Stock Analysis API');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Endpoint: ${url.toString()}`);
console.log(`👤 Handle: ${handle}`);
if (options.months) console.log(`📅 Months: ${options.months}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Expected response structure
const expectedFields = ['id', 'url', 'created_at', 'cashtag', 'text', 'begin', 'return', 'last', 'alpha'];

async function testEndpoint() {
  const startTime = Date.now();
  
  try {
    console.log('⏳ Making request...\n');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if needed
        // 'Authorization': `Bearer ${process.env.API_TOKEN}`,
        // 'X-API-Key': process.env.API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📦 Content-Type: ${response.headers.get('content-type')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ Request failed!');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Error: ${errorText.substring(0, 500)}`);
      process.exit(1);
    }

    const data = await response.json();
    
    // Validate response structure
    console.log('✅ Request successful!\n');
    console.log('🔍 Validating response structure...\n');
    
    if (!Array.isArray(data)) {
      console.error('❌ Response is not an array!');
      console.error(`Expected: Array`);
      console.error(`Received: ${typeof data}`);
      console.error(`Data:`, JSON.stringify(data, null, 2).substring(0, 500));
      process.exit(1);
    }

    console.log(`📈 Found ${data.length} items in response\n`);

    if (data.length === 0) {
      console.warn('⚠️  Warning: Response array is empty');
      console.log('This might be expected if the handle has no stock-related tweets.\n');
    }

    // Validate each item
    let validItems = 0;
    let invalidItems = 0;
    const issues = [];

    data.forEach((item, index) => {
      const missingFields = [];
      const wrongTypes = [];

      // Check for required fields
      expectedFields.forEach(field => {
        if (!(field in item)) {
          missingFields.push(field);
        } else {
          // Type validation
          const value = item[field];
          if (field === 'cashtag' && !Array.isArray(value)) {
            wrongTypes.push(`${field} should be array, got ${typeof value}`);
          } else if (field === 'id' && typeof value !== 'string') {
            wrongTypes.push(`${field} should be string, got ${typeof value}`);
          } else if (field === 'url' && typeof value !== 'string') {
            wrongTypes.push(`${field} should be string, got ${typeof value}`);
          } else if (field === 'created_at' && typeof value !== 'string') {
            wrongTypes.push(`${field} should be string, got ${typeof value}`);
          } else if (field === 'text' && typeof value !== 'string') {
            wrongTypes.push(`${field} should be string, got ${typeof value}`);
          } else if (['begin', 'return', 'last', 'alpha'].includes(field) && typeof value !== 'number') {
            wrongTypes.push(`${field} should be number, got ${typeof value}`);
          }
        }
      });

      if (missingFields.length > 0 || wrongTypes.length > 0) {
        invalidItems++;
        issues.push({
          index,
          missingFields,
          wrongTypes,
          item: item,
        });
      } else {
        validItems++;
      }
    });

    // Print validation results
    if (invalidItems === 0) {
      console.log('✅ All items have valid structure!\n');
    } else {
      console.warn(`⚠️  Found ${invalidItems} item(s) with issues:\n`);
      issues.forEach(({ index, missingFields, wrongTypes, item }) => {
        console.warn(`  Item ${index}:`);
        if (missingFields.length > 0) {
          console.warn(`    Missing fields: ${missingFields.join(', ')}`);
        }
        if (wrongTypes.length > 0) {
          console.warn(`    Type errors: ${wrongTypes.join(', ')}`);
        }
        console.warn(`    Data:`, JSON.stringify(item, null, 2).substring(0, 200));
        console.warn('');
      });
    }

    // Display sample data
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Sample Response Data:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (data.length > 0) {
      // Show first item
      const firstItem = data[0];
      console.log('First item:');
      console.log(JSON.stringify(firstItem, null, 2));
      console.log('');

      if (data.length > 1) {
        console.log(`... and ${data.length - 1} more item(s)\n`);
      }

      // Summary statistics
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Summary Statistics:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Total items: ${data.length}`);
      console.log(`Valid items: ${validItems}`);
      console.log(`Invalid items: ${invalidItems}`);
      
      // Count items with non-zero values (when API is fully implemented)
      const withNonZeroValues = data.filter(item => 
        item.begin !== 0 || item.return !== 0 || item.last !== 0 || item.alpha !== 0
      ).length;
      
      if (withNonZeroValues === 0) {
        console.log(`\n⚠️  Note: All items have begin=0, return=0, last=0, alpha=0`);
        console.log(`   (This is expected if the API is not yet calculating these values)`);
      } else {
        console.log(`Items with calculated values: ${withNonZeroValues}`);
      }
      
      // Count unique cashtags
      const allCashtags = new Set();
      data.forEach(item => {
        if (Array.isArray(item.cashtag)) {
          item.cashtag.forEach(tag => allCashtags.add(tag));
        }
      });
      console.log(`Unique stock tickers: ${allCashtags.size}`);
      if (allCashtags.size > 0) {
        console.log(`Tickers: ${Array.from(allCashtags).join(', ')}`);
      }
    }

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    
    if (error.message.includes('fetch')) {
      console.error('\n💡 Troubleshooting:');
      console.error('  - Check if the endpoint URL is correct');
      console.error('  - Verify your internet connection');
      console.error('  - Check if the API server is running');
      console.error('  - Verify CORS settings if testing from browser');
    }
    
    process.exit(1);
  }
}

// Run the test
testEndpoint();
