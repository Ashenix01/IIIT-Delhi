import { prisma } from "../config/prisma.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import {
  bookingInclude,
  serializeBooking,
  getAvailability,
  bookVisit,
  cancelVisit,
} from "../services/nurse.service.js";
import { audit } from "../utils/audit.js";

const NOTE = "Nurses help with short, routine tasks. They do not diagnose or prescribe. In an emergency, call 112.";

async function loadOwn(req) {
  const booking = await prisma.nurseBooking.findFirst({
    where: { id: req.params.id, patientId: req.user.patient.id },
    include: bookingInclude,
  });
  if (!booking) throw new HttpError(404, "Visit not found");
  return booking;
}

// GET /api/v1/nurse/services
export const listServices = asyncHandler(async (_req, res) => {
  const rows = await prisma.nurseServiceType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json({
    services: rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: Number(s.price),
      patientNote: s.patientNote,
    })),
    note: NOTE,
  });
});

// GET /api/v1/nurse/availability?serviceId=&date=YYYY-MM-DD&city=
export const availability = asyncHandler(async (req, res) => {
  const { serviceId, date, city } = req.query;
  const useCity = city ?? req.user.patient.city;
  const result = await getAvailability({ serviceId, day: date, city: useCity });
  res.json({
    date,
    city: useCity,
    timezone: "Asia/Kolkata",
    service: { id: result.service.id, name: result.service.name },
    slots: result.slots,
    emptyMessage:
      result.slots.length === 0
        ? "No nurses are free on this date in your city. Try another date."
        : null,
  });
});

// POST /api/v1/nurse/visits
export const bookNurseVisit = asyncHandler(async (req, res) => {
  const booking = await bookVisit({ patient: req.user.patient, input: req.body });
  await audit(req.user.id, req.ip, "NURSE_VISIT_BOOKED", "NurseBooking", booking.id);
  res.status(201).json({ visit: serializeBooking(booking), note: NOTE });
});

// GET /api/v1/nurse/visits?scope=upcoming|past|all
export const listVisits = asyncHandler(async (req, res) => {
  const now = new Date();
  const { scope } = req.query;
  const scopeFilter =
    scope === "upcoming"
      ? { status: "CONFIRMED", endsAt: { gte: now } }
      : scope === "past"
        ? { OR: [{ endsAt: { lt: now } }, { status: { in: ["COMPLETED", "CANCELLED"] } }] }
        : {};

  const rows = await prisma.nurseBooking.findMany({
    where: { patientId: req.user.patient.id, ...scopeFilter },
    include: bookingInclude,
    orderBy: { startsAt: scope === "upcoming" ? "asc" : "desc" },
    take: 100,
  });
  res.json({ visits: rows.map(serializeBooking) });
});

// GET /api/v1/nurse/visits/:id
export const getVisit = asyncHandler(async (req, res) => {
  res.json({ visit: serializeBooking(await loadOwn(req)) });
});

// PATCH /api/v1/nurse/visits/:id/cancel
export const cancelNurseVisit = asyncHandler(async (req, res) => {
  const booking = await loadOwn(req);
  const updated = await cancelVisit({ booking, reason: req.body.reason });
  await audit(req.user.id, req.ip, "NURSE_VISIT_CANCELLED", "NurseBooking", booking.id);
  res.json({ visit: serializeBooking(updated) });
});