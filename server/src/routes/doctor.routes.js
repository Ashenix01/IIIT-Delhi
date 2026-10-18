import { Router } from "express";
import { getDoctor } from "../controllers/doctor.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:id", requireAuth, getDoctor);

export default router;