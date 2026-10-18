import { Router } from "express";
import {
  listServices,
  availability,
  bookNurseVisit,
  listVisits,
  getVisit,
  cancelNurseVisit,
} from "../controllers/nurse.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  availabilitySchema,
  bookNurseSchema,
  listVisitsSchema,
  cancelVisitSchema,
} from "../validations/nurse.validation.js";

const router = Router();

router.use(requireAuth, requireRole("PATIENT"));

router.get("/services", listServices);
router.get("/availability", validate(availabilitySchema, "query"), availability);
router.post("/visits", validate(bookNurseSchema), bookNurseVisit);
router.get("/visits", validate(listVisitsSchema, "query"), listVisits);
router.get("/visits/:id", getVisit);
router.patch("/visits/:id/cancel", validate(cancelVisitSchema), cancelNurseVisit);

export default router;