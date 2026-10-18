import { env } from "../config/env.js";

export const isLlmEnabled = Boolean(env.OPENROUTER_API_KEY);

export async function chatJson({ system, user, temperature = 0.1 }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "HealthBridge AI",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`OpenRouter request failed (${res.status})`);

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}   