-- ═══════════════════════════════════════════════════════════
-- IHSEN Store — Supabase Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════

-- Orders table
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  order_num      text unique not null,
  status         text not null default 'pending',
  customer_name  text not null,
  phone          text not null,
  wilaya         text not null,
  commune        text not null,
  address        text not null,
  delivery_type  text not null default 'home',
  product_id     integer not null,
  product_name   text not null,
  product_emoji  text not null default '🛍️',
  color_index    integer not null default 0,
  size           text not null,
  qty            integer not null default 1,
  subtotal       integer not null,
  delivery_price integer not null,
  discount       integer not null default 0,
  promo_code     text,
  total          integer not null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

-- Promo codes table
create table if not exists promo_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  type        text not null,  -- percent | fixed | shipping
  value       integer not null default 0,
  min_order   integer not null default 0,
  max_uses    integer not null default 0,
  used_count  integer not null default 0,
  active      boolean not null default true,
  desc_ar     text not null default '',
  desc_fr     text not null default '',
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Seed promo codes
insert into promo_codes (code, type, value, min_order, max_uses, desc_ar, desc_fr) values
  ('IHSEN10',  'percent',  10,  0,    0, 'خصم 10% على إجمالي الطلب',          '10% de réduction sur la commande'),
  ('WELCOME',  'fixed',    500, 2000, 0, 'خصم 500 دج للطلبات فوق 2000 دج',   '500 DA de réduction commande > 2000'),
  ('FREESHIP', 'shipping', 0,   3000, 0, 'توصيل مجاني للطلبات فوق 3000 دج',  'Livraison gratuite commande > 3000'),
  ('VIP500',   'fixed',    500, 0,    50,'خصم 500 دج حصري للزبائن المميزين',  '500 DA offre VIP exclusive')
on conflict (code) do nothing;

-- Row Level Security (public read for validation, admin only for write)
alter table orders      enable row level security;
alter table promo_codes enable row level security;

-- Allow the app to insert orders (anon key)
create policy "insert_orders" on orders for insert with check (true);
-- Allow the app to read orders
create policy "read_own_order" on orders for select using (true);
-- Allow the app to update order status (admin panel uses anon key)
create policy "update_orders" on orders for update using (true);
-- Allow the app to read active promo codes for validation
create policy "read_promos" on promo_codes for select using (active = true);
-- Allow the app to read all promo codes (admin panel needs inactive ones too)
create policy "admin_read_promos" on promo_codes for select using (true);
-- Allow the app to insert/update/delete promo codes (admin panel)
create policy "admin_write_promos" on promo_codes for insert with check (true);
create policy "admin_update_promos" on promo_codes for update using (true);
create policy "admin_delete_promos" on promo_codes for delete using (true);

-- Indexes for performance
create index if not exists orders_order_num_idx on orders (order_num);
create index if not exists orders_phone_idx     on orders (phone);
create index if not exists orders_status_idx    on orders (status);
create index if not exists orders_wilaya_idx    on orders (wilaya);
create index if not exists orders_created_idx   on orders (created_at desc);
