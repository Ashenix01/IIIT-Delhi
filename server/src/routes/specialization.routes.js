import { Router } from "express";
import { listSpecializations } from "../controllers/specialization.controller.js";

const router = Router();

router.get("/", listSpecializations);

export default router;