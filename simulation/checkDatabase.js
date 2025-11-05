/**
 * Check what's actually in Supabase database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vjapeusemdciohsvnelx.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqYXBldXNlbWRjaW9oc3ZuZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDI4OTgsImV4cCI6MjA3NDkxODg5OH0.3p1cgqkSarLjj5Isb4fJ5lylMeVE618JUqG6hXdESgU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n📊 Checking Supabase Database\n');
  console.log('='.repeat(50));

  // Get all analyses
  const { data, error } = await supabase
    .from('analyses')
    .select('handle, total_calls, avg_return, alpha, win_rate')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n📭 No analyses found in database\n');
    return;
  }

  console.log(`\n✅ Found ${data.length} analyses:\n`);

  data.forEach((analysis, index) => {
    console.log(`${index + 1}. Handle: "${analysis.handle}"`);
    console.log(`   Trades: ${analysis.total_calls}`);
    console.log(`   Avg Return: ${analysis.avg_return}%`);
    console.log(`   Alpha: ${analysis.alpha}%`);
    console.log(`   Win Rate: ${analysis.win_rate}%`);
    console.log('');
  });

  // Check specific handle
  console.log('='.repeat(50));
  console.log('\n🔍 Checking for "armsgarrett" (lowercase):\n');

  const { data: armsData, error: armsError } = await supabase
    .from('analyses')
    .select('handle, total_calls, recent_recommendations')
    .eq('handle', 'armsgarrett')
    .maybeSingle();

  if (armsError) {
    console.error('❌ Error:', armsError.message);
    return;
  }

  if (!armsData) {
    console.log('❌ No data found for "armsgarrett"\n');
  } else {
    console.log(`✅ Found data for "${armsData.handle}"`);
    console.log(`   Trades: ${armsData.total_calls}`);

    if (armsData.recent_recommendations && armsData.recent_recommendations.length > 0) {
      console.log(`\n   First 3 tickers:`);
      armsData.recent_recommendations.slice(0, 3).forEach(trade => {
        console.log(`   - ${trade.ticker} (${trade.dateMentioned})`);
      });
    }
    console.log('');
  }
}

checkDatabase().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
