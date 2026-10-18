import { Router } from "express";
import {
  bookAppointment,
  listAppointments,
  getAppointment,
  joinAppointment,
  cancel,
  reschedule,
  setStatus,
} from "../controllers/appointment.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createAppointmentSchema,
  listSchema,
  cancelSchema,
  rescheduleSchema,
  statusSchema,
} from "../validations/appointment.validation.js";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("PATIENT"), validate(createAppointmentSchema), bookAppointment);
router.get("/", validate(listSchema, "query"), listAppointments);
router.get("/:id", getAppointment);
router.get("/:id/join", joinAppointment);
router.patch("/:id/cancel", validate(cancelSchema), cancel);
router.patch("/:id/reschedule", requireRole("PATIENT"), validate(rescheduleSchema), reschedule);
router.patch("/:id/status", requireRole("DOCTOR"), validate(statusSchema), setStatus);

export default router;