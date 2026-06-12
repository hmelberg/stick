/* stick — /api/create-animation
   Turns a natural-language scene description into stick JSON via Claude.

   Auth (same mechanism as m2py): the client sends `Authorization: Bearer <token>`.
   The token is accepted if it matches STICK_ACCESS_TOKEN (shared/dev code) or
   validates against the Anvil auth backend's /auth/me endpoint.

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
import { STICK_SYSTEM_PROMPT } from "./_lib/stick-prompt.ts";

interface RequestBody {
  description?: string;
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
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
  if (sharedToken && presentedToken === sharedToken) {
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

  const MAX_BODY_BYTES = 10_000;
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const ip = request.headers.get("x-nf-client-connection-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "";
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

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
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
    "Reply with ONLY the JSON object — no markdown fences, no commentary before or after.",
  ].join("\n");

  try {
    const stream = await streamAnthropic({
      apiKey,
      model,
      prompt,
      maxTokens: 4096,
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
    return new Response(`Upstream error: ${String(e)}`, { status: 502 });
  }
};
