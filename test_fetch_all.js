const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
async function test() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('orders').select('*');
  console.log("Data:", data);
  if (error) console.log("Error:", error);
}
test();
