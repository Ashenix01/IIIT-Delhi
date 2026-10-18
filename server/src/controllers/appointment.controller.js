import { prisma } from "../config/prisma.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import {
  appointmentInclude,
  serialize,
  joinWindow,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  finishAppointment,
} from "../services/appointment.service.js";
import { audit } from "../utils/audit.js";

// Loads an appointment only if it belongs to the logged-in patient or doctor.
async function loadOwn(req, include = appointmentInclude) {
  const { user } = req;
  const owner =
    user.role === "PATIENT" ? { patientId: user.patient.id } : { doctorId: user.doctor.id };
  const appt = await prisma.appointment.findFirst({
    where: { id: req.params.id, ...owner },
    include,
  });
  if (!appt) throw new HttpError(404, "Appointment not found");
  return appt;
}

// POST /api/v1/appointments
export const bookAppointment = asyncHandler(async (req, res) => {
  const appt = await createAppointment({ patient: req.user.patient, ...req.body });
  await audit(req.user.id, req.ip, "APPOINTMENT_BOOKED", "Appointment", appt.id);
  res.status(201).json({ appointment: serialize(appt, "PATIENT") });
});

// GET /api/v1/appointments?scope=upcoming|past|all
export const listAppointments = asyncHandler(async (req, res) => {
  const { user } = req;
  const now = new Date();
  const { scope } = req.query;
  const owner =
    user.role === "PATIENT" ? { patientId: user.patient.id } : { doctorId: user.doctor.id };

  const finished = ["COMPLETED", "CANCELLED", "NO_SHOW"];
  const scopeFilter =
    scope === "upcoming"
      ? { status: { in: ["PENDING", "CONFIRMED"] }, endsAt: { gte: now } }
      : scope === "past"
        ? { OR: [{ endsAt: { lt: now } }, { status: { in: finished } }] }
        : {};

  const rows = await prisma.appointment.findMany({
    where: { ...owner, ...scopeFilter },
    include: appointmentInclude,
    orderBy: { startsAt: scope === "upcoming" ? "asc" : "desc" },
    take: 100,
  });

  res.json({ appointments: rows.map((a) => serialize(a, user.role, now)) });
});

// GET /api/v1/appointments/:id
export const getAppointment = asyncHandler(async (req, res) => {
  const { user } = req;
  const appt = await loadOwn(req, { ...appointmentInclude, healthQuery: true });

  // A doctor only sees the summary if the patient chose to share it.
  let patientSummary = null;
  const e = appt.healthQuery?.extractedData;
  if (user.role === "DOCTOR" && appt.shareSummaryWithDoctor && e && appt.status !== "CANCELLED") {
    patientSummary = {
      label: "AI-generated from the patient's own description. It is not a medical assessment.",
      symptoms: e.symptoms ?? [],
      duration: e.duration ?? null,
      severity: e.severity ?? "unknown",
      missingInformation: e.missingInformation ?? [],
      originalDescription: appt.healthQuery.transcript,
    };
    await audit(user.id, req.ip, "PATIENT_SUMMARY_VIEWED", "Appointment", appt.id);
  }

  res.json({ appointment: serialize(appt, user.role), patientSummary });
});

// GET /api/v1/appointments/:id/join
export const joinAppointment = asyncHandler(async (req, res) => {
  const { user } = req;
  const appt = await loadOwn(req);

  if (appt.mode !== "ONLINE" || !appt.meetingUrl) {
    throw new HttpError(400, "This is not an online appointment");
  }
  if (appt.status !== "CONFIRMED") throw new HttpError(400, "This appointment is not active");

  const { opensAt, closesAt } = joinWindow(appt);
  const now = new Date();
  if (now < opensAt) {
    return res
      .status(403)
      .json({ error: "The room opens 10 minutes before the appointment", opensAt, closesAt });
  }
  if (now > closesAt) {
    return res.status(403).json({ error: "This appointment has ended", opensAt, closesAt });
  }

  const name = user.role === "DOCTOR" ? `Dr. ${user.doctor.name}` : user.patient.name;
  const meetingUrl = `${appt.meetingUrl}#userInfo.displayName=${encodeURIComponent(JSON.stringify(name))}`;

  await audit(user.id, req.ip, "CONSULT_JOINED", "Appointment", appt.id);
  res.json({ meetingUrl });
});

// PATCH /api/v1/appointments/:id/cancel
export const cancel = asyncHandler(async (req, res) => {
  const appt = await loadOwn(req);
  const updated = await cancelAppointment({
    appt,
    role: req.user.role,
    reason: req.body.reason,
  });
  await audit(req.user.id, req.ip, "APPOINTMENT_CANCELLED", "Appointment", appt.id);
  res.json({ appointment: serialize(updated, req.user.role) });
});

// PATCH /api/v1/appointments/:id/reschedule
export const reschedule = asyncHandler(async (req, res) => {
  const appt = await loadOwn(req);
  const updated = await rescheduleAppointment({
    appt,
    patient: req.user.patient,
    slotId: req.body.slotId,
  });
  await audit(req.user.id, req.ip, "APPOINTMENT_RESCHEDULED", "Appointment", appt.id);
  res.json({ appointment: serialize(updated, "PATIENT") });
});

// PATCH /api/v1/appointments/:id/status  (doctor)
export const setStatus = asyncHandler(async (req, res) => {
  const appt = await loadOwn(req);
  const updated = await finishAppointment({ appt, status: req.body.status });
  await audit(req.user.id, req.ip, `APPOINTMENT_${req.body.status}`, "Appointment", appt.id);
  res.json({ appointment: serialize(updated, "DOCTOR") });
});