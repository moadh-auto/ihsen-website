-- ══════════════════════════════════════════════════════════════
--  IHSEN — Migration 002: Promo Codes System
--  Run this in Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Create promo_codes table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        UNIQUE NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'percent'
              CHECK (type IN ('percent', 'fixed', 'shipping')),
  value       NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses    INTEGER     NOT NULL DEFAULT 0,    -- 0 = unlimited
  used_count  INTEGER     NOT NULL DEFAULT 0,
  active      BOOLEAN     NOT NULL DEFAULT true,
  desc_ar     TEXT        NOT NULL DEFAULT '',
  desc_fr     TEXT        NOT NULL DEFAULT '',
  category    TEXT        NOT NULL DEFAULT 'general'
              CHECK (category IN ('influencer', 'campaign', 'seasonal', 'general')),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add promo_code column to orders (if not already there)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- 3. RPC function: safely increment used_count (atomic)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_promo_used(p_code TEXT)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE promo_codes
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE code = p_code;
$$;

-- 4. Seed default codes (safe — will skip if code already exists)
-- ─────────────────────────────────────────────────────────────
INSERT INTO promo_codes (code, type, value, min_order, max_uses, desc_ar, desc_fr, category)
VALUES
  ('IHSEN10',  'percent',  10,  0,    0,  'خصم 10% على إجمالي الطلب',                 '10% de réduction sur la commande',      'general'),
  ('WELCOME',  'fixed',   500, 2000,  0,  'خصم 500 دج (للطلبات فوق 2000 دج)',          '500 DA de réduction (commande > 2000)', 'campaign'),
  ('FREESHIP', 'shipping',  0, 3000,  0,  'توصيل مجاني (للطلبات فوق 3000 دج)',         'Livraison gratuite (commande > 3000)',  'seasonal'),
  ('VIP500',   'fixed',   500,    0, 50,  'خصم 500 دج — حصري لزبائننا المميزين',       '500 DA — offre VIP exclusive',         'general')
ON CONFLICT (code) DO NOTHING;

-- 5. Enable Row Level Security (read-only for anon, full for service role)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active promo codes (needed for order form validation)
CREATE POLICY IF NOT EXISTS "public read active promos"
  ON promo_codes FOR SELECT
  USING (active = true);

-- Allow service role full access (admin panel uses anon key with RLS bypass)
-- If you're using the anon key for admin, add an admin policy here.
-- For now, upsert/delete go through the service role.

-- ══════════════════════════════════════════════════════════════
--  Done. Verify with:
--    SELECT * FROM promo_codes;
--    SELECT routine_name FROM information_schema.routines WHERE routine_name = 'increment_promo_used';
-- ══════════════════════════════════════════════════════════════
