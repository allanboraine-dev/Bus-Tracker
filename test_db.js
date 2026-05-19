const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kgvugtaoncxhlvmzzxhm.supabase.co';
const supabaseKey = 'sb_publishable_YmXbAHREBV-rvyuhO0QL7g_R622BJyy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('trips').select('*').eq('trip_code', 'CX-CT2JHB');
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
