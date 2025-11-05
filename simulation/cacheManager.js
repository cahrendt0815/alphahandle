#!/usr/bin/env node
/**
 * Tweet Cache Manager CLI
 * Usage: node simulation/cacheManager.js [command] [handle]
 */

const { getCacheMetadata, clearCache, clearAllCache } = require('./tweetCache');

const command = process.argv[2];
const handle = process.argv[3];

function displayHelp() {
  console.log('\nTweet Cache Manager');
  console.log('===================\n');
  console.log('Usage: node simulation/cacheManager.js [command] [handle]\n');
  console.log('Commands:');
  console.log('  list              - Show all cached handles');
  console.log('  clear <handle>    - Clear cache for specific handle');
  console.log('  clear-all         - Clear all cache');
  console.log('  help              - Show this help\n');
  console.log('Examples:');
  console.log('  node simulation/cacheManager.js list');
  console.log('  node simulation/cacheManager.js clear ArmsGarrett');
  console.log('  node simulation/cacheManager.js clear-all\n');
}

function listCache() {
  const metadata = getCacheMetadata();
  const handles = Object.keys(metadata);

  if (handles.length === 0) {
    console.log('\n📭 No cached tweets\n');
    return;
  }

  console.log('\n📦 Cached Tweets:\n');
  handles.forEach(key => {
    const data = metadata[key];
    const lastFetch = new Date(data.lastFetchDate);
    const hoursAgo = Math.round((new Date() - lastFetch) / (1000 * 60 * 60));

    console.log(`@${data.handle}`);
    console.log(`  Tweets: ${data.tweetCount}`);
    console.log(`  Last fetched: ${data.lastFetchDate} (${hoursAgo}h ago)`);
    console.log(`  Last tweet: ${data.lastTweetDate || 'N/A'}`);
    console.log('');
  });
}

// Execute command
switch (command) {
  case 'list':
    listCache();
    break;

  case 'clear':
    if (!handle) {
      console.error('\n❌ Error: Please specify a handle to clear');
      console.log('Usage: node simulation/cacheManager.js clear <handle>\n');
      process.exit(1);
    }
    clearCache(handle);
    console.log(`\n✅ Cache cleared for @${handle}\n`);
    break;

  case 'clear-all':
    clearAllCache();
    console.log('\n✅ All cache cleared\n');
    break;

  case 'help':
  case '-h':
  case '--help':
    displayHelp();
    break;

  default:
    console.error(`\n❌ Unknown command: ${command || '(none)'}\n`);
    displayHelp();
    process.exit(1);
}
