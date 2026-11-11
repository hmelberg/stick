import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPrompt, MAX_CURRENT, MAX_WARNINGS, MAX_WARNING_LEN } from "./prompt.ts";

Deno.test("create: description only", () => {
  const r = buildPrompt({ description: " a dog runs " });
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.mode, "create");
    assert(r.prompt.includes("a dog runs"));
  }
});

Deno.test("missing description without current is 400", () => {
  const r = buildPrompt({ description: "  " });
  assert(!r.ok);
  if (!r.ok) assertEquals(r.status, 400);
});

Deno.test("refine: current + description", () => {
  const r = buildPrompt({ description: "bigger dog", current: '{"a":1}' });
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.mode, "refine");
    assert(r.prompt.includes('{"a":1}') && r.prompt.includes("bigger dog"));
  }
});

Deno.test("repair: current + warnings, no description", () => {
  const r = buildPrompt({ current: '{"a":1}', warnings: ["bad event 3"] });
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.mode, "repair");
    assert(r.prompt.includes("1. bad event 3"));
  }
});

Deno.test("warnings without current is 400", () => {
  const r = buildPrompt({ warnings: ["x"] });
  assert(!r.ok);
});

Deno.test("oversized current is 413, not truncated", () => {
  const r = buildPrompt({ description: "x", current: "a".repeat(MAX_CURRENT + 1) });
  assert(!r.ok);
  if (!r.ok) assertEquals(r.status, 413);
});

Deno.test("warnings are capped and filtered", () => {
  const w = Array.from({ length: 50 }, () => "w".repeat(1000));
  const r = buildPrompt({ current: "{}", warnings: [...w, 5, ""] });
  assert(r.ok);
  if (r.ok) {
    assert(r.prompt.includes(`${MAX_WARNINGS}. `));
    assert(!r.prompt.includes(`${MAX_WARNINGS + 1}. `));
    assert(!r.prompt.includes("w".repeat(MAX_WARNING_LEN + 1)));
  }
});

Deno.test("bad types are 400", () => {
  const a = buildPrompt({ description: "x", current: 5 });
  const b = buildPrompt({ description: "x", current: "{}", warnings: "no" });
  assert(!a.ok && !b.ok);
});
