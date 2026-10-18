import { Router } from "express";
import { recommend } from "../controllers/recommendation.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { recommendSchema } from "../validations/recommendation.validation.js";

const router = Router();

router.use(requireAuth, requireRole("PATIENT"));
router.post("/", validate(recommendSchema), recommend);

export default router;