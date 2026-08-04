-- ═══════════════════════════════════════════════════════════
-- IHSEN — Products Table
-- Run in Supabase SQL Editor (new query)
-- ═══════════════════════════════════════════════════════════

create table if not exists products (
  id             serial primary key,
  name_ar        text not null,
  name_fr        text not null,
  category       text not null,
  price          integer not null,
  original_price integer,
  badge          text,
  emoji          text not null default '🛍️',
  colors         text[] not null default '{}',
  in_stock       boolean not null default true,
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger products_updated_at before update on products
  for each row execute function update_updated_at();

alter table products enable row level security;

drop policy if exists "read_products"       on products;
drop policy if exists "admin_ins_products"  on products;
drop policy if exists "admin_upd_products"  on products;
drop policy if exists "admin_del_products"  on products;

create policy "read_products"      on products for select using (true);
create policy "admin_ins_products" on products for insert with check (true);
create policy "admin_upd_products" on products for update using (true);
create policy "admin_del_products" on products for delete using (true);

-- Seed existing 8 products
insert into products (id, name_ar, name_fr, category, price, badge, emoji, colors, sort_order) values
  (1,'فولار حرير ناعم — كلاسيك','Foulard soie douce — Classique','فولار',  1800,'new', '🧣',ARRAY['#1B4D3E','#AF8E4A','#F0EBE3','#8B4513'],1),
  (2,'حجاب شيفون خفيف — ربيعي', 'Hijab chiffon léger — Printemps','حجاب', 1500,'hot', '🧕',ARRAY['#DEB887','#6B8E6B','#C4A882'],             2),
  (3,'عباية إحسان الكلاسيكية',   'Abaya Ihsen Classique',          'عبايات',4200,'sale','👗',ARRAY['#1a1a1a','#244D3B','#4A3728'],             3),
  (4,'هودي قطن دافئ — ذهبي',     'Hoodie coton chaud — Doré',      'هوديز', 2900,'new', '🧥',ARRAY['#AF8E4A','#F5F0E8','#6B6B6B'],             4),
  (5,'فولار جيرسي فخم — بريميوم','Foulard jersey luxe — Premium',  'فولار', 2200,'hot', '🧣',ARRAY['#2C5F2E','#800000','#00008B'],             5),
  (6,'حجاب مخمل فاخر — شتوي',   'Hijab velours luxe — Hiver',     'حجاب',  1800, null,  '🧕',ARRAY['#722F37','#1B4D3E','#1C1C1C'],             6),
  (7,'عباية مطرزة — إحسان ليمتد','Abaya brodée — Ihsen Limited',   'عبايات',6500,'new', '👗',ARRAY['#1a1a1a','#AF8E4A'],                       7),
  (8,'هودي محتشم طويل — زيتي',   'Hoodie long modest — Olive',     'هوديز', 3400,'sale','🧥',ARRAY['#556B2F','#8B7355','#2F4F4F'],             8)
on conflict (id) do nothing;

-- Fix the serial sequence so next insert gets id > 8
select setval('products_id_seq', (select max(id) from products));
