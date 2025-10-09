require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('handle', 'abc')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Data in Supabase for @abc:');
  console.log(JSON.stringify(data, null, 2));
}

debug();
