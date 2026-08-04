/**
 * sanitize.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Input sanitization utilities — XSS / injection defense layer.
 *
 * Rules:
 *  · Never import this on the CLIENT side for secret logic — it is shared
 *    between server routes and client-side pre-submit validation.
 *  · All functions return a safe string; never throw — callers decide whether
 *    to reject (validate) or accept the cleaned value (sanitize).
 */

// ── Core helpers ─────────────────────────────────────────────────────────────

/** Escape HTML entities — use when embedding user text inside HTML (e.g. emails). */
export function escapeHtml(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/** Strip all HTML/XML tags from a string. */
function stripTags(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')           // remove tags
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ') // collapse HTML entities
    .replace(/javascript\s*:/gi, '')   // strip js: protocol
    .replace(/on\w+\s*=/gi, '');       // strip inline event handlers
}

// ── Field-specific sanitizers ─────────────────────────────────────────────────

/**
 * General text field — strips tags, trims, enforces max length.
 * Use for: address, notes, message, etc.
 */
export function sanitizeText(raw: unknown, maxLen = 500): string {
  if (typeof raw !== 'string') return '';
  return stripTags(raw).replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * Name field — allows Arabic, French/Latin letters, spaces, hyphens.
 * Rejects digits and all punctuation/special characters.
 */
export function sanitizeName(raw: unknown, maxLen = 100): string {
  if (typeof raw !== 'string') return '';
  return stripTags(raw)
    .replace(/[<>{}&"'\\;()[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Phone number — only digits, +, spaces, dashes, dots, parentheses.
 * Strips everything else.
 */
export function sanitizePhone(raw: unknown, maxLen = 20): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^\d+\s\-.()/]/g, '').trim().slice(0, maxLen);
}

/**
 * Enum / known-value field — accepts only one of the provided allowed values.
 * Returns the fallback (or '') if the value isn't in the list.
 */
export function sanitizeEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T | '' = '',
): T | '' {
  if (typeof raw !== 'string') return fallback;
  const v = raw.trim() as T;
  return allowed.includes(v) ? v : fallback;
}

/**
 * Positive integer — clamps to [min, max].
 */
export function sanitizeInt(raw: unknown, min = 1, max = 9999): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// ── Compound: full order sanitization ────────────────────────────────────────

export interface RawOrderFields {
  customer_name: unknown;
  phone:         unknown;
  wilaya:        unknown;
  commune:       unknown;
  address:       unknown;
  notes:         unknown;
  size:          unknown;
  qty:           unknown;
  delivery_type: unknown;
  promo_code:    unknown;
}

const ALLOWED_DELIVERY = ['home', 'office'] as const;
const ALLOWED_SIZES    = ['XS','S','M','L','XL','XXL',
                          '36','37','38','39','40','41',
                          '42','43','44','45','46'] as const;

export function sanitizeOrder(raw: RawOrderFields) {
  return {
    customer_name: sanitizeName(raw.customer_name, 100),
    phone:         sanitizePhone(raw.phone, 20),
    wilaya:        sanitizeText(raw.wilaya, 60),
    commune:       sanitizeText(raw.commune, 80),
    address:       sanitizeText(raw.address, 200),
    notes:         raw.notes ? sanitizeText(raw.notes, 500) : null,
    size:          sanitizeEnum(raw.size, ALLOWED_SIZES, ''),
    qty:           sanitizeInt(raw.qty, 1, 50),
    delivery_type: sanitizeEnum(raw.delivery_type, ALLOWED_DELIVERY, 'home'),
    promo_code:    raw.promo_code
                     ? sanitizeText(raw.promo_code, 30).toUpperCase()
                     : null,
  };
}

// ── Compound: contact form sanitization ──────────────────────────────────────

export interface RawContactFields {
  name:    unknown;
  phone:   unknown;
  message: unknown;
}

export function sanitizeContact(raw: RawContactFields) {
  return {
    name:    sanitizeName(raw.name, 100),
    phone:   sanitizePhone(raw.phone, 20),
    message: sanitizeText(raw.message, 2000),
  };
}

// ── Validation helpers (throw-safe, return error string or null) ─────────────

export function validateContact(fields: ReturnType<typeof sanitizeContact>): string | null {
  if (!fields.name)    return 'الاسم مطلوب';
  if (!fields.message) return 'الرسالة مطلوبة';
  if (fields.message.length < 5) return 'الرسالة قصيرة جداً';
  return null;
}

export function validateOrder(fields: ReturnType<typeof sanitizeOrder>): string | null {
  if (!fields.customer_name) return 'الاسم مطلوب';
  if (!fields.phone)          return 'رقم الهاتف مطلوب';
  if (!fields.wilaya)         return 'الولاية مطلوبة';
  if (!fields.commune)        return 'البلدية مطلوبة';
  if (!fields.address)        return 'العنوان مطلوب';
  if (fields.qty < 1)         return 'الكمية غير صالحة';
  return null;
}
