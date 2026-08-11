// ── Brand Colors ──────────────────────────────────────────
export const COLORS = {
  green:      '#244D3B',
  greenDark:  '#1D4939',
  greenHero:  '#0F2419',
  gold:       '#AF8E4A',
  goldLight:  '#DAC08B',
} as const;

// ── Categories ────────────────────────────────────────────
export const MAIN_CATEGORIES = [
  { id: 'clothing',  ar: 'ملابس',     fr: 'Vêtements',   emoji: '👗' },
  { id: 'shoe',      ar: 'أحذية',     fr: 'Chaussures',  emoji: '🥿' },
  { id: 'accessory', ar: 'إكسسوارات', fr: 'Accessoires', emoji: '👜' },
] as const;

export const CATEGORIES = [
  { id: 'foulard',  ar: 'فولار',   fr: 'Foulards', count: 48 },
  { id: 'hijab',    ar: 'حجاب',    fr: 'Hijabs',   count: 62 },
  { id: 'abaya',    ar: 'عبايات',  fr: 'Robes',    count: 35 },
  { id: 'hoodie',   ar: 'هوديز',   fr: 'Hoodies',  count: 27 },
] as const;

// ── Trust Badges ──────────────────────────────────────────
export const TRUST_BADGES = [
  { d: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6m2 10V5a1 1 0 011-1h2a1 1 0 011 1v1m-4 14l4-1 4 1V9m-8 7h.01M17 13h.01', ar: 'توصيل لـ 69 ولاية',  fr: 'Livraison 69 wilayas',  descAr: 'نوصّل لجميع ولايات الجزائر',        descFr: 'Livraison partout en Algérie' },
  { d: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', ar: 'الدفع عند الاستلام', fr: 'Paiement à la livraison', descAr: 'ادفعي نقداً عند استلام طلبك',       descFr: 'Payez en espèces à la réception' },
  { d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', ar: 'جودة مضمونة',        fr: 'Qualité garantie',        descAr: 'منتجات مختارة بعناية فائقة',        descFr: 'Produits sélectionnés avec soin' },
  { d: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', ar: 'تأكيد هاتفي',        fr: 'Confirmation téléphonique', descAr: 'نتصل بكِ قبل إرسال كل طلب',     descFr: 'Nous confirmons avant l\'envoi' },
] as const;

// ── Products (demo) ────────────────────────────────────────
export const FEATURED_PRODUCTS = [
  { id: 1, nameAr: 'فولار حرير ناعم — كلاسيك', nameFr: 'Foulard soie douce — Classique', category: 'فولار', price: 1800, badge: 'new', colors: ['#1B4D3E', '#AF8E4A', '#F0EBE3', '#8B4513'] },
  { id: 2, nameAr: 'حجاب شيفون خفيف — ربيعي',  nameFr: 'Hijab chiffon léger — Printemps', category: 'حجاب', price: 1500, badge: 'hot', colors: ['#DEB887', '#6B8E6B', '#C4A882'] },
  { id: 3, nameAr: 'عباية إحسان الكلاسيكية',    nameFr: 'Abaya Ihsen Classique',           category: 'عبايات', price: 4200, badge: 'sale', colors: ['#1a1a1a', '#244D3B', '#4A3728'] },
  { id: 4, nameAr: 'هودي قطن دافئ — ذهبي',      nameFr: 'Hoodie coton chaud — Doré',       category: 'هوديز', price: 2900, badge: 'new', colors: ['#AF8E4A', '#F5F0E8', '#6B6B6B'] },
  { id: 5, nameAr: 'فولار جيرسي فخم — بريميوم', nameFr: 'Foulard jersey luxe — Premium',   category: 'فولار', price: 2200, badge: 'hot', colors: ['#2C5F2E', '#800000', '#00008B'] },
  { id: 6, nameAr: 'حجاب مخمل فاخر — شتوي',    nameFr: 'Hijab velours luxe — Hiver',      category: 'حجاب', price: 1800, badge: null, colors: ['#722F37', '#1B4D3E', '#1C1C1C'] },
  { id: 7, nameAr: 'عباية مطرزة — إحسان ليمتد', nameFr: 'Abaya brodée — Ihsen Limited',    category: 'عبايات', price: 6500, badge: 'new', colors: ['#1a1a1a', '#AF8E4A'] },
  { id: 8, nameAr: 'هودي محتشم طويل — زيتي',    nameFr: 'Hoodie long modest — Olive',      category: 'هوديز', price: 3400, badge: 'sale', colors: ['#556B2F', '#8B7355', '#2F4F4F'] },
] as const;

// ── Promo Codes ────────────────────────────────────────────
// These are seeded here for demo — the admin dashboard will manage them later.
export type PromoType = 'percent' | 'fixed' | 'shipping';

export type PromoCategory = 'influencer' | 'campaign' | 'seasonal' | 'general';

export interface PromoCode {
  code:       string;
  type:       PromoType;
  value:      number;    // 10 = 10% | 500 = 500 DA off | 0 = free shipping
  minOrder:   number;    // minimum subtotal to be eligible
  maxUses:    number;    // 0 = unlimited
  active:     boolean;
  descAr:     string;
  descFr:     string;
  // optional fields from Supabase
  usedCount?: number;
  category?:  PromoCategory;
  expiresAt?: string | null;
}

export const PROMO_CODES: PromoCode[] = [
  {
    code: 'IHSEN10',   type: 'percent',  value: 10,   minOrder: 0,    maxUses: 0,
    active: true,
    descAr: 'خصم 10% على إجمالي الطلب',
    descFr: '10% de réduction sur la commande',
  },
  {
    code: 'WELCOME',   type: 'fixed',    value: 500,  minOrder: 2000, maxUses: 0,
    active: true,
    descAr: 'خصم 500 دج (للطلبات فوق 2000 دج)',
    descFr: '500 DA de réduction (commande > 2000 DA)',
  },
  {
    code: 'FREESHIP',  type: 'shipping', value: 0,    minOrder: 3000, maxUses: 0,
    active: true,
    descAr: 'توصيل مجاني (للطلبات فوق 3000 دج)',
    descFr: 'Livraison gratuite (commande > 3000 DA)',
  },
  {
    code: 'VIP500',    type: 'fixed',    value: 500,  minOrder: 0,    maxUses: 50,
    active: true,
    descAr: 'خصم 500 دج — حصري لزبائننا المميزين',
    descFr: '500 DA — offre VIP exclusive',
  },
];

/** Validate a promo code against the current subtotal.
 *  Returns the matching PromoCode or null if invalid/ineligible. */
export function validatePromo(code: string, subtotal: number): PromoCode | null {
  const p = PROMO_CODES.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!p || !p.active)           return null;
  if (subtotal < p.minOrder)     return null;
  return p;
}

/** Calculate the discount amount given a promo and current delivery price. */
export function calcDiscount(promo: PromoCode, subtotal: number, deliveryPrice: number): number {
  if (promo.type === 'percent')  return Math.round(subtotal * promo.value / 100);
  if (promo.type === 'fixed')    return Math.min(promo.value, subtotal);
  if (promo.type === 'shipping') return deliveryPrice;
  return 0;
}

// ── Order Statuses ─────────────────────────────────────────
export const ORDER_STATUSES = [
  { id: 'pending',        ar: 'في الانتظار',      fr: 'En attente',         color: '#6B7280' },
  { id: 'reviewing',      ar: 'قيد المراجعة',     fr: 'En révision',        color: '#F59E0B' },
  { id: 'confirmed',      ar: 'مؤكد',             fr: 'Confirmé',           color: '#10B981' },
  { id: 'modified',       ar: 'معدّل',            fr: 'Modifié',            color: '#8B5CF6' },
  { id: 'shipped',        ar: 'تم الشحن',         fr: 'Expédié',            color: '#3B82F6' },
  { id: 'attempt_failed', ar: 'محاولة فاشلة',    fr: 'Tentative échouée',  color: '#EF4444' },
  { id: 'delivered',      ar: 'تم التسليم',       fr: 'Livré',              color: '#059669' },
  { id: 'returned',       ar: 'مُرجع',            fr: 'Retourné',           color: '#DC2626' },
  { id: 'cancelled',      ar: 'ملغى',             fr: 'Annulé',             color: '#991B1B' },
] as const;
