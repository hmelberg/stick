// Pure auth helpers. Run from netlify/edge-functions:
//   deno check *.ts _lib/*.ts && deno test --allow-all _lib/
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { clientIp, timingSafeEqual } from "./auth.ts";

Deno.test("timingSafeEqual matches identical strings", () => {
  assertEquals(timingSafeEqual("hemmelig", "hemmelig"), true);
});

Deno.test("timingSafeEqual rejects a different string of the same length", () => {
  assertEquals(timingSafeEqual("hemmelig", "hemmeliG"), false);
});

Deno.test("timingSafeEqual rejects a prefix without comparing early", () => {
  // A plain === returns on the first mismatch; this must not.
  assertEquals(timingSafeEqual("hem", "hemmelig"), false);
  assertEquals(timingSafeEqual("hemmelig", "hem"), false);
});

Deno.test("timingSafeEqual handles empty input", () => {
  assertEquals(timingSafeEqual("", "hemmelig"), false);
  assertEquals(timingSafeEqual("", ""), true);
});

Deno.test("clientIp trusts only the platform-set header", () => {
  const req = new Request("https://stick.melberg.app/api/create-animation", {
    headers: { "x-nf-client-connection-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" },
  });
  assertEquals(clientIp(req), "9.9.9.9");
});

Deno.test("clientIp ignores x-forwarded-for entirely", () => {
  // A client can set x-forwarded-for freely; honouring it would let one
  // attacker rotate through fake IPs and never exhaust the budget.
  const req = new Request("https://stick.melberg.app/api/create-animation", {
    headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
  });
  assertEquals(clientIp(req), "");
});
