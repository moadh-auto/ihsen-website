-- IHSEN — Additional RLS Policies
-- امسح كل شيء في SQL Editor والصق هذا ثم اضغط Run

drop policy if exists "update_orders"        on orders;
drop policy if exists "admin_read_promos"    on promo_codes;
drop policy if exists "admin_write_promos"   on promo_codes;
drop policy if exists "admin_update_promos"  on promo_codes;
drop policy if exists "admin_delete_promos"  on promo_codes;

create policy "update_orders"       on orders       for update using (true);
create policy "admin_read_promos"   on promo_codes  for select using (true);
create policy "admin_write_promos"  on promo_codes  for insert with check (true);
create policy "admin_update_promos" on promo_codes  for update using (true);
create policy "admin_delete_promos" on promo_codes  for delete using (true);
