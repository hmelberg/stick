/* stick — user-prompt builder for /api/create-animation (pure, unit-tested).
   Three modes, chosen by which fields are present:
     create : description only
     refine : description + current
     repair : current + warnings (description optional)  */

export const MAX_DESCRIPTION = 2000;
export const MAX_CURRENT = 60_000;
export const MAX_WARNINGS = 30;
export const MAX_WARNING_LEN = 300;

export type Mode = "create" | "refine" | "repair";

export interface PromptInput {
  description?: unknown;
  current?: unknown;
  warnings?: unknown;
}

export type PromptResult =
  | { ok: true; mode: Mode; prompt: string }
  | { ok: false; status: number; message: string };

const COMPACT =
  "Keep the document compact enough to finish within the length limit: represent crowds or full teams with a handful of representative figures (about 4-8), not every individual, and keep the timeline focused. A document that gets cut off mid-JSON cannot be rendered.";
const ONLY_JSON =
  "Reply with ONLY the complete JSON object — no markdown fences, no commentary before or after.";

export function buildPrompt(input: PromptInput): PromptResult {
  const description = typeof input.description === "string"
    ? input.description.trim().slice(0, MAX_DESCRIPTION)
    : "";

  let current = "";
  if (input.current !== undefined && input.current !== null) {
    if (typeof input.current !== "string") {
      return { ok: false, status: 400, message: "current must be a string" };
    }
    current = input.current.trim();
    // A truncated JSON document is useless, so refuse instead of cutting.
    if (current.length > MAX_CURRENT) {
      return { ok: false, status: 413, message: "Current document too large" };
    }
  }

  let warnings: string[] = [];
  if (input.warnings !== undefined && input.warnings !== null) {
    if (!Array.isArray(input.warnings)) {
      return { ok: false, status: 400, message: "warnings must be an array" };
    }
    warnings = input.warnings
      .filter((w) => typeof w === "string")
      .map((w: string) => w.trim().slice(0, MAX_WARNING_LEN))
      .filter((w) => w)
      .slice(0, MAX_WARNINGS);
  }

  if (current && warnings.length && !description) {
    const list = warnings.map((w, i) => `${i + 1}. ${w}`).join("\n");
    return {
      ok: true,
      mode: "repair",
      prompt: [
        "Here is a stick animation document. Compiling it produced these warnings:",
        "",
        list,
        "",
        "Current document:",
        "",
        current,
        "",
        "Fix every warning so the document compiles cleanly, changing as little else as possible. Return the complete corrected document, not a diff.",
        "",
        COMPACT,
        "",
        ONLY_JSON,
      ].join("\n"),
    };
  }

  if (!description) {
    return { ok: false, status: 400, message: "Missing description" };
  }

  if (current) {
    const parts = [
      "Revise this existing stick animation document according to the instruction below.",
      "",
      "Current document:",
      "",
      current,
      "",
      "Instruction:",
      "",
      '"""',
      description,
      '"""',
      "",
    ];
    if (warnings.length) {
      parts.push(
        "The current document also has these compile warnings; fix them as well:",
        ...warnings.map((w, i) => `${i + 1}. ${w}`),
        "",
      );
    }
    parts.push(
      "Keep everything the instruction does not touch. Return the complete revised document, not a diff.",
      "",
      COMPACT,
      "",
      ONLY_JSON,
    );
    return { ok: true, mode: "refine", prompt: parts.join("\n") };
  }

  return {
    ok: true,
    mode: "create",
    prompt: [
      "Write a stick animation document for this request:",
      "",
      '"""',
      description,
      '"""',
      "",
      COMPACT,
      "",
      "Reply with ONLY the JSON object — no markdown fences, no commentary before or after.",
    ].join("\n"),
  };
}
