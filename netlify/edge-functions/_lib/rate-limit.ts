// @ts-ignore - @netlify/blobs imported via esm.sh for Deno/Edge Function compatibility
import { getStore } from "https://esm.sh/@netlify/blobs@7";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 10;

interface RateRecord {
  calls: number[];
}

interface RateStore {
  get(key: string, opts: { type: "json" }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<unknown>;
}

export async function checkRateLimit(
  endpoint: string,
  ip: string,
  // Injectable for tests; defaults to the Netlify Blobs store.
  getStoreImpl: (name: string) => RateStore = getStore as unknown as (
    name: string,
  ) => RateStore,
  // The auth gate needs a roomier budget than the generation endpoint, so a
  // legitimate user's sign-in attempts never eat into their generation quota.
  maxCalls: number = MAX_CALLS,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!ip) return { allowed: true, retryAfterSeconds: 0 };
  try {
    const store = getStoreImpl("rate-limits");
    const key = `${endpoint}:${ip}`;
    const now = Date.now();
    // NOTE: this read-modify-write is not atomic — Netlify Blobs has no
    // compare-and-set, so two truly-concurrent requests for the same key can
    // race and undercount. Accepted: this is a coarse abuse guard.
    const record = (await store.get(key, { type: "json" })) as RateRecord ?? { calls: [] };
    record.calls = record.calls.filter((t) => now - t < WINDOW_MS);
    if (record.calls.length >= maxCalls) {
      const oldest = record.calls[0];
      const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
      return { allowed: false, retryAfterSeconds: retryAfter };
    }
    record.calls.push(now);
    await store.setJSON(key, record);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (e) {
    // Fail open. Throwing here would 500 EVERY request during a Blobs
    // hiccup — a worse outage than briefly missing the limit. (safestat hit
    // exactly this and made the same change.)
    console.warn("rate-limit store error (failing open):", e);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
