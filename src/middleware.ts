/**
 * middleware.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. Add security HTTP response headers on every page / API response.
 *  2. Block suspiciously large request bodies early (before they hit routes).
 *  3. Reject requests with obviously malicious query strings.
 */
import { NextRequest, NextResponse } from 'next/server';

// ── Security headers ──────────────────────────────────────────────────────────
const SECURITY_HEADERS: [string, string][] = [
  // Prevent browsers from MIME-sniffing the content type
  ['X-Content-Type-Options', 'nosniff'],
  // Deny embedding in iframes (clickjacking protection)
  ['X-Frame-Options', 'DENY'],
  // Enable the XSS filter in older browsers
  ['X-XSS-Protection', '1; mode=block'],
  // Restrict referrer information
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  // Disable unnecessary browser features
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
  // Force HTTPS for 1 year (enable once you have a valid SSL cert in production)
  // ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
];

// ── Patterns that should never appear in a legitimate URL ────────────────────
const MALICIOUS_URL_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,        // onload=, onerror=, etc.
  /union\s+select/i,   // SQL injection probes
  /;\s*drop\s+table/i,
  /\.\.\//,            // path traversal
  /etc\/passwd/i,
  /\/proc\/self/i,
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname + req.nextUrl.search;

  // ── 1. Reject obviously malicious URLs ──────────────────────────────────
  for (const pattern of MALICIOUS_URL_PATTERNS) {
    if (pattern.test(url)) {
      return new NextResponse('Bad Request', { status: 400 });
    }
  }

  // ── 2. Block oversized Content-Length before it reaches handlers ─────────
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) { // 1 MB
    return new NextResponse('Payload Too Large', { status: 413 });
  }

  // ── 3. Add security headers to response ──────────────────────────────────
  const res = NextResponse.next();
  for (const [name, value] of SECURITY_HEADERS) {
    res.headers.set(name, value);
  }

  return res;
}

export const config = {
  // Apply to all routes except Next.js internals and static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logos/|images/|fonts/).*)',
  ],
};
