import { Router } from "express";
import {
  registerPatient,
  registerDoctor,
  login,
  logout,
  me,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import {
  patientRegisterSchema,
  doctorRegisterSchema,
  loginSchema,
} from "../validations/auth.validation.js";

const router = Router();

router.post("/patient/register", authLimiter, validate(patientRegisterSchema), registerPatient);
router.post("/doctor/register", authLimiter, validate(doctorRegisterSchema), registerDoctor);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;