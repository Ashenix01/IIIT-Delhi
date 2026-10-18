import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  JITSI_BASE_URL: z.string().url().default("https://meet.jit.si").transform((v) => v.replace(/\/$/, "")),
  OPENROUTER_API_KEY: z.string().optional().default(""),
    TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_WHATSAPP_FROM: z.string().optional().default(""),
  DEFAULT_COUNTRY_CODE: z.string().optional().default("+91"),
  OPENROUTER_MODEL: z
    .string()
    .optional()
    .transform((v) => v || "openai/gpt-4o-mini"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;