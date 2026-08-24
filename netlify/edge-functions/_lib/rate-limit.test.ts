import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkRateLimit } from "./rate-limit.ts";

function fakeStore() {
  const data: Record<string, unknown> = {};
  return () => ({
    get: (key: string) => Promise.resolve(data[key] ?? null),
    setJSON: (key: string, value: unknown) => {
      data[key] = value;
      return Promise.resolve();
    },
  });
}

Deno.test("the default budget is 10 calls", async () => {
  const store = fakeStore();
  for (let i = 0; i < 10; i++) {
    assertEquals((await checkRateLimit("ep", "1.2.3.4", store)).allowed, true);
  }
  assertEquals((await checkRateLimit("ep", "1.2.3.4", store)).allowed, false);
});

Deno.test("a caller-supplied budget overrides the default", async () => {
  // The auth gate needs a roomier budget than the generation endpoint, so a
  // legitimate user's sign-in attempts never eat their generation quota.
  const store = fakeStore();
  for (let i = 0; i < 25; i++) {
    assertEquals((await checkRateLimit("auth", "1.2.3.4", store, 25)).allowed, true, `call ${i}`);
  }
  const blocked = await checkRateLimit("auth", "1.2.3.4", store, 25);
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.retryAfterSeconds > 0, true);
});

Deno.test("separate endpoints keep separate budgets", async () => {
  const store = fakeStore();
  for (let i = 0; i < 10; i++) await checkRateLimit("ep", "1.2.3.4", store);
  assertEquals((await checkRateLimit("other", "1.2.3.4", store)).allowed, true);
});
