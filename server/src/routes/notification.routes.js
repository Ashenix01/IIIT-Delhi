import { Router } from "express";
import {
  listNotifications,
  markRead,
  markAllRead,
  sendTest,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);
router.post("/test", sendTest);

export default router;