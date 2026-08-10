const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
async function test() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);
  const { error } = await supabase.from('orders').insert({
        order_num:     'IH-999999',
        customer_name: "Test",
        phone:         "0600000000",
        wilaya:        "Test",
        commune:       "Test",
        address:       "Test",
        delivery_type: "home",
        product_id:    1,
        product_name:  "Test",
        product_emoji: "🛍️",
        color_index:   0,
        size:          "M",
        qty:           1,
        subtotal:      1000,
        delivery_price: 500,
        discount:      0,
        total:         1500,
        items:         '[]'
  });
  console.log("Error:", error);
}
test();
