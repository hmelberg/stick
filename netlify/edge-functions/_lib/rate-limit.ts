// @ts-ignore - @netlify/blobs imported via esm.sh for Deno/Edge Function compatibility
import { getStore } from "https://esm.sh/@netlify/blobs@7";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 10;

interface RateRecord {
  calls: number[];
}

export async function checkRateLimit(
  endpoint: string,
  ip: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!ip) return { allowed: true, retryAfterSeconds: 0 };
  const store = getStore("rate-limits");
  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const record = (await store.get(key, { type: "json" })) as RateRecord ?? { calls: [] };
  record.calls = record.calls.filter((t) => now - t < WINDOW_MS);
  if (record.calls.length >= MAX_CALLS) {
    const oldest = record.calls[0];
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  record.calls.push(now);
  await store.setJSON(key, record);
  return { allowed: true, retryAfterSeconds: 0 };
}
