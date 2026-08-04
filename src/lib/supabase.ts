import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Database types ─────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending' | 'reviewing' | 'confirmed' | 'modified'
  | 'shipped'  | 'attempt_failed' | 'delivered' | 'returned' | 'cancelled';

export interface Order {
  id:            string;
  order_num:     string;      // IH-XXXXXX
  status:        OrderStatus;
  customer_name: string;
  phone:         string;
  wilaya:        string;
  commune:       string;
  address:       string;
  delivery_type: 'home' | 'office';
  product_id:    number;
  product_name:  string;
  product_emoji: string;
  color_index:   number;
  size:          string;
  qty:           number;
  subtotal:      number;
  delivery_price:number;
  discount:      number;
  promo_code:    string | null;
  total:         number;
  notes:          string | null;
  items:          string | null;  // JSON array of cart items (multi-product orders)
  stock_deducted: boolean;   // true once qty has been subtracted from product stock
  created_at:    string;
  updated_at:    string;
}

export interface Product {
  id:              number;
  name_ar:         string;
  name_fr:         string;
  category:        string;
  price:           number;
  original_price:  number | null;
  badge:           string | null;
  emoji:           string;
  colors:          string[];
  images:          string[];      // Supabase Storage public URLs
  thumbnail_index: number;        // index of the main thumbnail in images[]
  color_images:    Record<string, number> | null; // { '#244D3B': 2 } → color hex → image index
  stock:           Record<string, number> | null; // { '#244D3B:M': 5, '#AF8E4A:L': 0 } → color:size → qty
  desc_ar:         string | null;
  desc_fr:         string | null;
  in_stock:        boolean;
  active:          boolean;
  sort_order:      number;
  created_at:      string;
  updated_at:      string;
}

export interface PromoCodeRow {
  id:         string;
  code:       string;
  type:       'percent' | 'fixed' | 'shipping';
  value:      number;
  min_order:  number;
  max_uses:   number;
  used_count: number;
  active:     boolean;
  desc_ar:    string;
  desc_fr:    string;
  category:   'influencer' | 'campaign' | 'seasonal' | 'general';
  expires_at: string | null;
  created_at: string;
}
