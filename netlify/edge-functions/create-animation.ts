/* stick — /api/create-animation
   Turns a natural-language scene description into stick JSON via Claude.

   Auth (same mechanism as m2py): the client sends `Authorization: Bearer <token>`.
   The token is accepted if it matches STICK_ACCESS_TOKEN (shared/dev code) or
   validates against the Anvil auth backend's /auth/me endpoint.

   BYOK: alternatively the client sends its own Anthropic key in `X-Anthropic-Key`.
   That skips token auth (the user pays for their own calls) and the request is
   made with their key — relayed per request, never stored or logged here.

   Required Netlify env vars:
     ANTHROPIC_API_KEY        — server-side Anthropic key (never sent to client)
   Optional:
     ANTHROPIC_MODEL          — default "claude-sonnet-4-6"
     STICK_ACCESS_TOKEN       — shared access code fallback
     STICK_ANVIL_VALIDATE_URL — default "https://mdataapi.anvil.app/_/api/auth/me"

   Response: SSE stream of {type:"text"|"done"|"error"} events (see _lib/anthropic.ts).
   The client accumulates the text events into the JSON document. */
import { streamAnthropic } from "./_lib/anthropic.ts";
import { checkRateLimit } from "./_lib/rate-limit.ts";
import { clientIp, timingSafeEqual } from "./_lib/auth.ts";
import { STICK_SYSTEM_PROMPT } from "./_lib/stick-prompt.ts";

interface RequestBody {
  description?: string;
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // A user-supplied Anthropic key replaces token auth: the user pays for the
  // call themselves, so there is nothing of ours to protect behind sign-in.
  const userKey = (request.headers.get("x-anthropic-key") ?? "").trim();

  if (!userKey) {
    // Budget check BEFORE any auth work. Two reasons: an unlimited number of
    // wrong access codes could otherwise be tried, and each wrong one fires a
    // network call to the free-tier Anvil app below — measured 2026-08-24
    // against prod, a wrong code costs ~150ms warm and woke a cold Anvil in
    // 7.4s. A roomier budget than the generation limit so signing in never
    // eats into a legitimate user's quota.
    const authRate = await checkRateLimit("create-animation-auth", clientIp(request), undefined, 30);
    if (!authRate.allowed) {
      return new Response("Rate limited", {
        status: 429,
        headers: { "Retry-After": String(authRate.retryAfterSeconds) },
      });
    }

    const VALIDATE_URL = Deno.env.get("STICK_ANVIL_VALIDATE_URL")
      ?? "https://mdataapi.anvil.app/_/api/auth/me";
    const sharedToken = Deno.env.get("STICK_ACCESS_TOKEN");

    const authHeader = request.headers.get("authorization") ?? "";
    const presentedToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!presentedToken) {
      return new Response("Unauthorized: missing token", { status: 401 });
    }

    let authenticated = false;
    if (sharedToken && timingSafeEqual(presentedToken, sharedToken)) {
      authenticated = true;
    }
    if (!authenticated) {
      try {
        const resp = await fetch(VALIDATE_URL, {
          method: "GET",
          headers: { "Authorization": `Bearer ${presentedToken}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && (data.user || data.principal_kind === "service_token" || data.principal_kind === "anonymous")) {
            authenticated = true;
          }
        }
      } catch (_e) {
        // auth backend unreachable — treat as unauthorized rather than crashing
      }
    }
    if (!authenticated) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const MAX_BODY_BYTES = 10_000;
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const ip = clientIp(request);
  const rate = await checkRateLimit("create-animation", ip);
  if (!rate.allowed) {
    return new Response("Rate limited", {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (_) {
    return new Response("Invalid JSON", { status: 400 });
  }
  const description = (body.description ?? "").trim().slice(0, 2000);
  if (!description) {
    return new Response("Missing description", { status: 400 });
  }

  const apiKey = userKey || Deno.env.get("ANTHROPIC_API_KEY");
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
  if (!apiKey) {
    return new Response("Server misconfigured: missing ANTHROPIC_API_KEY", { status: 500 });
  }

  const prompt = [
    "Write a stick animation document for this request:",
    "",
    '"""',
    description,
    '"""',
    "",
    "Keep the document compact enough to finish within the length limit: represent crowds or full teams with a handful of representative figures (about 4-8), not every individual, and keep the timeline focused. A document that gets cut off mid-JSON cannot be rendered.",
    "",
    "Reply with ONLY the JSON object — no markdown fences, no commentary before or after.",
  ].join("\n");

  try {
    const stream = await streamAnthropic({
      apiKey,
      model,
      prompt,
      maxTokens: 16000,
      system: STICK_SYSTEM_PROMPT,
      cacheTtl: "1h",
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    // A 401 from Anthropic with a user-supplied key means the key is bad — tell
    // the client so it can say "check your key" instead of "sign in again".
    if (userKey && /API error 401/.test(String(e))) {
      return new Response("API key rejected", { status: 401 });
    }
    return new Response(`Upstream error: ${String(e)}`, { status: 502 });
  }
};
