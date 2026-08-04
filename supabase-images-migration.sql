-- ═══════════════════════════════════════════════════════════
-- IHSEN — Images Migration
-- Run ONCE in Supabase SQL Editor after supabase-products.sql
-- ═══════════════════════════════════════════════════════════

-- 1. Add image columns to products table
alter table products
  add column if not exists images          text[]  not null default '{}',
  add column if not exists thumbnail_index integer not null default 0;

-- 2. Create Storage bucket for product images (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB max per file
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- 3. Storage RLS policies — allow public read, admin write
drop policy if exists "public read product images"  on storage.objects;
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;

create policy "public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

create policy "admin update product images"
  on storage.objects for update
  using (bucket_id = 'product-images');

create policy "admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');
