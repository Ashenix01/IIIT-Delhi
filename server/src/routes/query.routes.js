import { Router } from "express";
import {
  extractQuery,
  confirmQuery,
  listQueries,
  getQuery,
} from "../controllers/query.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { queryLimiter } from "../middleware/rateLimit.js";
import { extractQuerySchema, confirmQuerySchema } from "../validations/query.validation.js";

const router = Router();

router.use(requireAuth, requireRole("PATIENT"));

router.post("/extract", queryLimiter, validate(extractQuerySchema), extractQuery);
router.post("/:id/confirm", validate(confirmQuerySchema), confirmQuery);
router.get("/", listQueries);
router.get("/:id", getQuery);

export default router;