import { env } from "../config/env.js";

// Turns a stored phone number into +<country code><number>, or null if it is not usable.
export function toE164(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const digits = s.replace(/\D/g, "");

  if (s.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `${env.DEFAULT_COUNTRY_CODE}${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

export function maskPhone(e164) {
  if (!e164) return null;
  return `${e164.slice(0, 3)}${"*".repeat(Math.max(e164.length - 7, 0))}${e164.slice(-4)}`;
}