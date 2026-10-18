import { z } from "zod";

export const recommendSchema = z.object({
  queryId: z.string().min(1),
  mode: z.enum(["ONLINE", "IN_PERSON"]).optional(),
  maxFee: z.coerce.number().min(0).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});