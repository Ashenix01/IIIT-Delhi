import { env } from "../config/env.js";

export const twilioEnabled = Boolean(
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM
);

const withPrefix = (n) => (n.startsWith("whatsapp:") ? n : `whatsapp:${n}`);

// The sandbox allows about one message every 3 seconds, so sends go through one queue.
const SPACING_MS = 3100;
let chain = Promise.resolve();
let lastSent = 0;

function enqueue(task) {
  const run = chain.then(async () => {
    const wait = lastSent + SPACING_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await task();
    } finally {
      lastSent = Date.now();
    }
  });
  chain = run.catch(() => {});
  return run;
}

async function send(to, body) {
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: withPrefix(env.TWILIO_WHATSAPP_FROM),
        To: withPrefix(to),
        Body: body,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Only the error code is logged, never the message or number.
    const code = json.code ?? res.status;
    console.error(`[notify] Twilio error ${code}`);
    return { status: "failed", code };
  }
  return { status: "sent" };
}

export function sendWhatsApp(to, body) {
  if (!twilioEnabled) {
    console.log("[notify] Twilio is not configured, WhatsApp skipped");
    return Promise.resolve({ status: "skipped" });
  }
  return enqueue(() => send(to, body)).catch(() => {
    console.error("[notify] WhatsApp request failed");
    return { status: "failed", code: "network" };
  });
}