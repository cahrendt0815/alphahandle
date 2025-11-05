/**
 * Test script for handle search
 *
 * Usage: npx tsx fintwit-performance/scripts/tryHandle.ts <handle>
 * Example: npx tsx fintwit-performance/scripts/tryHandle.ts elonmusk
 */

import 'dotenv/config';
import { getFilteredTweetsForHandle } from '../services/handleSearch';

const handle = process.argv[2] || 'jack';

console.log(`\n🔍 Testing handle search for @${handle}\n`);

getFilteredTweetsForHandle(handle, { maxCount: 50 })
  .then(({ kept, scanned }) => {
    console.log(`\n✅ Scanned ${scanned} tweets, kept ${kept.length}:\n`);

    if (kept.length === 0) {
      console.log('No stock mentions found.');
    } else {
      for (const t of kept) {
        const preview = t.text?.slice(0, 140);
        const date = t.created_at ? ` [${new Date(t.created_at).toLocaleDateString()}]` : '';
        console.log(`- ${preview}${date}`);
      }
    }

    console.log('');
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message || err);
    console.error('\nStack:', err.stack);
    process.exit(1);
  });
