// Pure auth helpers for the stick edge functions. Kept free of any Blobs or
// network import so they can be tested on their own.
//
// These mirror safestat's _lib/auth.ts deliberately: stick shares m2py's
// sign-in backend, and the two fixes below are ones safestat already made.

/**
 * Constant-time string comparison — no early return on the first mismatch.
 * A plain `===` leaks how many leading characters of the shared access code
 * were correct, which turns guessing it into a per-character search instead
 * of a search over the whole code.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** The slice of Netlify's edge Context this needs (avoids a remote type import). */
export interface IpContext {
  ip?: string;
}

/**
 * Client IP for rate limiting.
 *
 * Edge functions receive the IP on the Context object; the
 * x-nf-client-connection-ip header is documented for Netlify *Functions* and
 * is not guaranteed at the edge — relying on it alone made checkRateLimit
 * return early with an empty id, so nothing was ever counted.
 *
 * x-forwarded-for is NOT consulted: a client can forge it and rotate through
 * fake IPs to dodge the budget entirely.
 */
export function clientIp(request: Request, context?: IpContext): string {
  return (context?.ip ?? "") || (request.headers.get("x-nf-client-connection-ip") ?? "");
}
