import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /api/v1/specializations
export const listSpecializations = asyncHandler(async (_req, res) => {
  const specializations = await prisma.specialization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      subSpecializations: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  res.json({ specializations });
});