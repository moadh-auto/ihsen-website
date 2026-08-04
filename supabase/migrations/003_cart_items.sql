-- ══════════════════════════════════════════════════════════════
--  IHSEN — Migration 003: Cart / Multi-item Orders
--  Run this in Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Add items JSONB column to orders (stores array of cart items)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;

-- Structure of each item in the array:
-- {
--   "productId":   number,
--   "nameAr":      string,
--   "nameFr":      string,
--   "emoji":       string,
--   "image":       string | null,
--   "color":       string,   -- hex
--   "colorIndex":  number,
--   "size":        string,
--   "qty":         number,
--   "price":       number,   -- unit price at time of order
--   "category":    string
-- }

-- Index for querying orders that contain a specific product
CREATE INDEX IF NOT EXISTS idx_orders_items ON orders USING GIN (items);

-- ══════════════════════════════════════════════════════════════
--  Done. Verify with:
--    SELECT id, order_num, items FROM orders WHERE items IS NOT NULL LIMIT 5;
-- ══════════════════════════════════════════════════════════════
