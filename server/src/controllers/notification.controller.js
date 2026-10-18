import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import { notifyUser } from "../services/notification.service.js";
import { twilioEnabled } from "../services/twilio.service.js";
import { toE164, maskPhone } from "../utils/phone.js";

// GET /api/v1/notifications?unread=true
export const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(req.query.unread === "true" ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  res.json({ notifications, unreadCount });
});

// PATCH /api/v1/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const n = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!n) throw new HttpError(404, "Notification not found");
  await prisma.notification.update({ where: { id: n.id }, data: { readAt: n.readAt ?? new Date() } });
  res.json({ ok: true });
});

// PATCH /api/v1/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: result.count });
});

const HINTS = {
  63015: "This number has not joined the sandbox. From that WhatsApp, send your join code to +14155238886.",
  63016: "Outside the 24-hour window. From that WhatsApp, send any message to +14155238886, then try again.",
  20003: "Twilio rejected the Account SID or Auth Token. Check the values in .env.",
};

// POST /api/v1/notifications/test  (development only)
export const sendTest = asyncHandler(async (req, res) => {
  if (env.NODE_ENV === "production") throw new HttpError(404, "Route not found");

  const profile = req.user.patient ?? req.user.doctor;
  const to = toE164(profile.phone);
  const result = await notifyUser({
    userId: req.user.id,
    phone: profile.phone,
    title: "Test message",
    body: "This is a test notification from HealthBridge.",
  });

  res.json({
    twilioConfigured: twilioEnabled,
    sentTo: maskPhone(to),
    result,
    hint: HINTS[result.code] ?? null,
  });
});