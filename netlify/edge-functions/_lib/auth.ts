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

/**
 * Client IP for rate limiting. Netlify sets x-nf-client-connection-ip itself
 * and a client cannot forge it. x-forwarded-for CAN be forged, so it is
 * deliberately NOT a fallback — honouring it would let one attacker rotate
 * through fake IPs and never exhaust the budget.
 */
export function clientIp(request: Request): string {
  return request.headers.get("x-nf-client-connection-ip") ?? "";
}
