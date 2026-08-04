/**
 * POST /api/contact
 * ───────────────────────────────────────────────────────────────────────────
 * Security layers applied:
 *  · Rate limiting  — 5 requests / minute per IP (ratelimit.ts)
 *  · Input sanitization — strip tags, length-cap, HTML-escape (sanitize.ts)
 *  · Parameterized queries — Supabase JS SDK uses prepared statements
 *  · Email XSS — user content is HTML-escaped before embedding in email body
 *  · Secrets — RESEND_API_KEY read from env var only, never hardcoded
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeContact, validateContact, escapeHtml } from '@/lib/sanitize';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

// ── Supabase client (uses env vars — never hardcoded) ────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
);

export async function POST(req: NextRequest) {
  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  const ip     = getClientIp(req);
  const limit  = rateLimit(ip, 'contact');

  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests — please wait a moment.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(limit.resetInMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  // ── 2. Parse body (with size guard) ──────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  // ── 3. Sanitize ───────────────────────────────────────────────────────────
  const r = raw as Record<string, unknown>;
  const fields = sanitizeContact({ name: r.name, phone: r.phone, message: r.message });

  // ── 4. Validate ───────────────────────────────────────────────────────────
  const validErr = validateContact(fields);
  if (validErr) {
    return NextResponse.json({ ok: false, error: validErr }, { status: 400 });
  }

  const { name, phone, message } = fields;

  // ── 5. Persist to Supabase (parameterized via SDK) ────────────────────────
  await sb.from('contact_messages').insert({ name, phone, message });

  // ── 6. Notification email (HTML-escaped — no XSS) ────────────────────────
  const { data: settingRow } = await sb
    .from('site_settings')
    .select('value')
    .eq('key', 'notification_email')
    .maybeSingle();

  const notifEmail = (settingRow as { value: string } | null)?.value?.trim();

  if (notifEmail && process.env.RESEND_API_KEY) {
    // HTML-escape EVERY user-supplied value before embedding in HTML
    const safeName    = escapeHtml(name);
    const safePhone   = escapeHtml(phone);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const htmlBody = `
      <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:560px;margin:0 auto;background:#f9f6f1;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#244D3B,#0F2419);padding:28px 32px;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:3px;color:#AF8E4A;text-transform:uppercase;font-family:Arial">IHSEN — رسالة جديدة</p>
          <h1 style="margin:8px 0 0;font-size:22px;color:#fff">لديكِ رسالة جديدة</h1>
        </div>
        <div style="padding:28px 32px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e8dfd2;font-size:12px;color:#6b6b6b;width:100px">الاسم</td>
              <td style="padding:10px 0;border-bottom:1px solid #e8dfd2;font-size:14px;color:#1a1a1a;font-weight:700">${safeName}</td>
            </tr>
            ${safePhone ? `<tr>
              <td style="padding:10px 0;border-bottom:1px solid #e8dfd2;font-size:12px;color:#6b6b6b">الهاتف</td>
              <td style="padding:10px 0;border-bottom:1px solid #e8dfd2;font-size:14px;color:#1a1a1a;direction:ltr">${safePhone}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:10px 0;font-size:12px;color:#6b6b6b;vertical-align:top">الرسالة</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a;line-height:1.6">${safeMessage}</td>
            </tr>
          </table>
          <div style="margin-top:24px;background:#244D3B14;border:1px solid #244D3B30;border-radius:10px;padding:14px 16px;font-size:12px;color:#4E6D5C;text-align:center">
            يمكنكِ قراءة الرسالة والرد عليها من لوحة تحكم إحسان
          </div>
        </div>
        <div style="padding:16px 32px;background:#f0ebe3;text-align:center;font-size:11px;color:#9ca3af">
          © ${new Date().getFullYear()} إحسان — ihsen.dz
        </div>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'IHSEN Store <onboarding@resend.dev>',
        to:      [notifEmail],
        subject: `📩 رسالة جديدة من ${safeName}`,
        html:    htmlBody,
      }),
    });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { 'X-RateLimit-Remaining': String(limit.remaining) } },
  );
}
