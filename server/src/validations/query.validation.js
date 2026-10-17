import { z } from "zod";
import { extractionSchema } from "../services/extraction.service.js";

export const extractQuerySchema = z.object({
  transcript: z.string().trim().min(5, "Please describe your concern in a bit more detail").max(4000),
  language: z.enum(["en", "hi"]).default("en"),
  inputMode: z.enum(["VOICE", "TEXT"]).default("TEXT"),
});

export const confirmQuerySchema = z.object({
  extraction: extractionSchema,
});