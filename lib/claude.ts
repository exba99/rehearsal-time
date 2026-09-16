import "server-only";
import os from "node:os";

export type Provider = "api" | "subscription";

/** `FEEDBACK_PROVIDER` wins; otherwise use the API if a key is set, else the Claude subscription. */
export function resolveProvider(): Provider {
  const p = process.env.FEEDBACK_PROVIDER?.trim().toLowerCase();
  if (p === "api" || p === "subscription") return p;
  return process.env.ANTHROPIC_API_KEY ? "api" : "subscription";
}

export async function generateFeedback(system: string, user: string): Promise<string> {
  return resolveProvider() === "api" ? viaApi(system, user) : viaSubscription(system, user);
}

async function viaApi(system: string, user: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const msg = await new Anthropic().messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: user }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

/**
 * Claude Agent SDK, authenticated with the Claude login of the machine running the server
 * (`claude login` / Claude Code). Personal, local use only.
 */
async function viaSubscription(system: string, user: string) {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  // Never let an API key leak into the subprocess: it would bill the API instead of the plan.
  const env = { ...process.env } as Record<string, string | undefined>;
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;

  let text = "";
  let failure: string | null = null;
  for await (const m of query({
    prompt: user,
    options: {
      systemPrompt: system,
      model: process.env.CLAUDE_SUBSCRIPTION_MODEL || undefined,
      tools: [], // pure text generation, no file or shell access
      maxTurns: 1,
      settingSources: [], // ignore local CLAUDE.md / settings
      persistSession: false,
      cwd: os.tmpdir(),
      env,
    },
  })) {
    if (m.type === "result") {
      if (m.subtype === "success" && !m.is_error) text = m.result;
      else failure = "result" in m && typeof m.result === "string" ? m.result : `Claude run failed (${m.subtype}).`;
    }
  }
  if (failure) throw new Error(failure);
  if (!text.trim()) throw new Error("Empty response from Claude. Is this machine logged in? Run `claude` then `/login`.");
  return text.trim();
}
