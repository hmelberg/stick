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

Deno.test("clientIp prefers the edge context, which is where the IP actually is", () => {
  const req = new Request("https://stick.melberg.app/api/create-animation");
  assertEquals(clientIp(req, { ip: "9.9.9.9" }), "9.9.9.9");
});

Deno.test("clientIp falls back to the platform header when no context is given", () => {
  const req = new Request("https://stick.melberg.app/api/create-animation", {
    headers: { "x-nf-client-connection-ip": "8.8.8.8" },
  });
  assertEquals(clientIp(req), "8.8.8.8");
});

Deno.test("clientIp ignores x-forwarded-for entirely", () => {
  // A client can set x-forwarded-for freely; honouring it would let one
  // attacker rotate through fake IPs and never exhaust the budget.
  const req = new Request("https://stick.melberg.app/api/create-animation", {
    headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
  });
  assertEquals(clientIp(req), "");
  assertEquals(clientIp(req, { ip: "" }), "");
});
