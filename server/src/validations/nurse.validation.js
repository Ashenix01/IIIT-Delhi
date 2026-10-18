import { z } from "zod";

export const availabilitySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD"),
  city: z.string().trim().min(2).max(80).optional(),
});

export const bookNurseSchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.coerce.date(),
  address: z.string().trim().min(5).max(250).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  landmark: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  consentShareAddress: z.literal(true, {
    errorMap: () => ({ message: "You must agree to share your address with the nurse" }),
  }),
});

export const listVisitsSchema = z.object({
  scope: z.enum(["upcoming", "past", "all"]).default("upcoming"),
});

export const cancelVisitSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});