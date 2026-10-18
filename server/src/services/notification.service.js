import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { toE164 } from "../utils/phone.js";
import { sendWhatsApp } from "./twilio.service.js";

const when = (d) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d);

const modeText = (m) => (m === "ONLINE" ? "online" : "in-person");
const partySelect = { select: { name: true, phone: true, userId: true } };

// Notification functions never throw, so a failed message cannot break a booking.
const safe =
  (fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch {
      console.error("[notify] failed");
    }
  };

// Saves an in-app notification and sends WhatsApp when it is set up.
export async function notifyUser({ userId, phone, title, body }) {
  try {
    await prisma.notification.create({ data: { userId, title, body } });
  } catch {
    console.error("[notify] could not save notification");
  }

  const to = toE164(phone);
  if (!to) return { whatsapp: "no-valid-number" };

  const result = await sendWhatsApp(to, `*${title}*\n${body}`);
  return { whatsapp: result.status, code: result.code };
}

const loadAppointment = (id) =>
  prisma.appointment.findUnique({
    where: { id },
    include: { patient: partySelect, doctor: partySelect },
  });

// ───────── Appointments ─────────

export const notifyAppointmentBooked = safe(async (id) => {
  const a = await loadAppointment(id);
  if (!a) return;
  const online = a.mode === "ONLINE";

  await notifyUser({
    userId: a.patient.userId,
    phone: a.patient.phone,
    title: "Appointment confirmed",
    body: `Your ${modeText(a.mode)} appointment with Dr. ${a.doctor.name} is confirmed for ${when(a.startsAt)}.${
      online ? " You can join from the app 10 minutes before the start." : ""
    }`,
  });
  await notifyUser({
    userId: a.doctor.userId,
    phone: a.doctor.phone,
    title: "New appointment",
    body: `${a.patient.name} booked a ${modeText(a.mode)} appointment for ${when(a.startsAt)}.`,
  });
});

export const notifyAppointmentCancelled = safe(async (id) => {
  const a = await loadAppointment(id);
  if (!a) return;
  const byPatient = a.cancelledBy === "PATIENT";
  const target = byPatient ? a.doctor : a.patient;
  const who = byPatient ? a.patient.name : `Dr. ${a.doctor.name}`;

  await notifyUser({
    userId: target.userId,
    phone: target.phone,
    title: "Appointment cancelled",
    body: `The appointment on ${when(a.startsAt)} was cancelled by ${who}.${
      byPatient ? "" : " You can book another time from the app."
    }`,
  });
});

export const notifyAppointmentRescheduled = safe(async (id, oldStartsAt) => {
  const a = await loadAppointment(id);
  if (!a) return;
  const text = `The appointment on ${when(oldStartsAt)} was moved to ${when(a.startsAt)}.`;

  await notifyUser({ userId: a.patient.userId, phone: a.patient.phone, title: "Appointment rescheduled", body: text });
  await notifyUser({ userId: a.doctor.userId, phone: a.doctor.phone, title: "Appointment rescheduled", body: `${a.patient.name}: ${text}` });
});

// Reminders: 24 hours and 1 hour before. Only future times are saved.
export const scheduleAppointmentReminders = safe(async ({ id, startsAt }) => {
  const now = Date.now();
  const times = [24 * 3600e3, 3600e3]
    .map((ms) => new Date(startsAt.getTime() - ms))
    .filter((t) => t.getTime() > now);

  await prisma.$transaction([
    prisma.appointmentReminder.deleteMany({ where: { appointmentId: id, sentAt: null } }),
    prisma.appointmentReminder.createMany({
      data: times.map((remindAt) => ({ appointmentId: id, remindAt })),
    }),
  ]);
});

export const clearAppointmentReminders = safe(async (id) => {
  await prisma.appointmentReminder.deleteMany({ where: { appointmentId: id, sentAt: null } });
});

// ───────── Nurse visits ─────────

const loadVisit = (id) =>
  prisma.nurseBooking.findUnique({
    where: { id },
    include: { patient: partySelect, nurse: { select: { name: true } } },
  });

export const notifyNurseVisitBooked = safe(async (id) => {
  const v = await loadVisit(id);
  if (!v) return;
  await notifyUser({
    userId: v.patient.userId,
    phone: v.patient.phone,
    title: "Nurse visit confirmed",
    body: `Your nurse home visit is confirmed for ${when(v.startsAt)}. ${v.nurse.name} will visit you.`,
  });
});

export const notifyNurseVisitCancelled = safe(async (id) => {
  const v = await loadVisit(id);
  if (!v) return;
  await notifyUser({
    userId: v.patient.userId,
    phone: v.patient.phone,
    title: "Nurse visit cancelled",
    body: `Your nurse home visit on ${when(v.startsAt)} was cancelled.`,
  });
});

// ───────── Reminder job ─────────

async function sendDueAppointmentReminders() {
  const now = new Date();
  const due = await prisma.appointmentReminder.findMany({
    where: {
      sentAt: null,
      remindAt: { lte: now },
      appointment: { status: "CONFIRMED", startsAt: { gt: now } },
    },
    include: { appointment: { include: { patient: partySelect, doctor: partySelect } } },
    take: 25,
  });

  for (const r of due) {
    // Claim the reminder first so it is never sent twice.
    const claimed = await prisma.appointmentReminder.updateMany({
      where: { id: r.id, sentAt: null },
      data: { sentAt: now },
    });
    if (claimed.count === 0) continue;

    const a = r.appointment;
    await notifyUser({
      userId: a.patient.userId,
      phone: a.patient.phone,
      title: "Appointment reminder",
      body: `Your ${modeText(a.mode)} appointment with Dr. ${a.doctor.name} is on ${when(a.startsAt)}.`,
    });
    await notifyUser({
      userId: a.doctor.userId,
      phone: a.doctor.phone,
      title: "Appointment reminder",
      body: `${a.patient.name} has a ${modeText(a.mode)} appointment on ${when(a.startsAt)}.`,
    });
  }
}

async function sendDueNurseReminders() {
  const now = new Date();
  const due = await prisma.nurseBooking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + 60 * 60 * 1000) },
    },
    include: { patient: partySelect, nurse: { select: { name: true } } },
    take: 25,
  });

  for (const v of due) {
    const claimed = await prisma.nurseBooking.updateMany({
      where: { id: v.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;

    await notifyUser({
      userId: v.patient.userId,
      phone: v.patient.phone,
      title: "Nurse visit reminder",
      body: `Your nurse home visit is at ${when(v.startsAt)}. ${v.nurse.name} will visit you.`,
    });
  }
}

export function startReminderJob() {
  if (env.NODE_ENV === "test") return undefined;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueAppointmentReminders();
      await sendDueNurseReminders();
    } catch {
      console.error("[reminders] run failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, 60 * 1000);
  timer.unref?.();
  tick();
  return timer;
}