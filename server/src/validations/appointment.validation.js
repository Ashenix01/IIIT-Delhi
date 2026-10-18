import { z } from "zod";

export const createAppointmentSchema = z
  .object({
    slotId: z.string().min(1),
    reason: z.string().trim().max(500).optional(),
    healthQueryId: z.string().min(1).optional(),
    shareSummaryWithDoctor: z.boolean().default(false),
  })
  .refine((d) => !d.shareSummaryWithDoctor || d.healthQueryId, {
    message: "Choose which health query to share",
    path: ["healthQueryId"],
  });

export const listSchema = z.object({
  scope: z.enum(["upcoming", "past", "all"]).default("upcoming"),
});

export const cancelSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const rescheduleSchema = z.object({
  slotId: z.string().min(1),
});

export const statusSchema = z.object({
  status: z.enum(["COMPLETED", "NO_SHOW"]),
});