import { prisma } from "../config/prisma.js";
import { HttpError } from "../middleware/errorHandler.js";

const TRAVEL_BUFFER_MIN = 30;
const MIN_LEAD_MS = 2 * 60 * 60 * 1000;
const CANCEL_BEFORE_MS = 2 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");
// Calendar day in India as YYYY-MM-DD.
const istDay = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata" }).format(d);
// The exact moment of a given hour on a given India day, whatever the server's time zone.
const istInstant = (day, hour) => new Date(`${day}T${pad(hour)}:00:00+05:30`);

export const bookingInclude = {
  nurse: {
    select: { id: true, name: true, qualification: true, yearsOfExperience: true, languages: true, isDemo: true },
  },
  service: { select: { id: true, name: true, durationMinutes: true, patientNote: true } },
};

export function serializeBooking(b) {
  return {
    id: b.id,
    status: b.status,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    address: b.address,
    city: b.city,
    landmark: b.landmark,
    notes: b.notes,
    price: Number(b.price),
    nurse: { ...b.nurse, verified: true },
    service: b.service,
    cancelledAt: b.cancelledAt,
    cancelReason: b.cancelReason,
    createdAt: b.createdAt,
  };
}

async function getActiveService(serviceId) {
  const service = await prisma.nurseServiceType.findFirst({ where: { id: serviceId, isActive: true } });
  if (!service) throw new HttpError(404, "Service not found");
  return service;
}

function assertBookableDay(day, now = new Date()) {
  const today = istDay(now);
  const last = istDay(new Date(now.getTime() + MAX_DAYS_AHEAD * DAY_MS));
  if (day < today || day > last) {
    throw new HttpError(400, `Choose a date between ${today} and ${last}`);
  }
}

// Free start times for one service, city and day. Works with prisma or a transaction.
async function computeSlots({ service, city, day, db = prisma }) {
  const dayStart = istInstant(day, 0);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const blockMs = (service.durationMinutes + TRAVEL_BUFFER_MIN) * 60000;
  const earliest = Date.now() + MIN_LEAD_MS;

  const nurses = await db.nurse.findMany({
    where: {
      verificationStatus: "VERIFIED",
      city: { equals: city, mode: "insensitive" },
      services: { some: { id: service.id } },
    },
    include: {
      bookings: {
        where: { status: "CONFIRMED", startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
        select: { startsAt: true, endsAt: true },
      },
    },
  });

  const slots = new Map();
  for (const nurse of nurses) {
    const shiftEnd = istInstant(day, nurse.workEndHour).getTime();
    for (let h = nurse.workStartHour; h < nurse.workEndHour; h++) {
      const start = istInstant(day, h);
      const end = new Date(start.getTime() + blockMs);
      if (start.getTime() < earliest || end.getTime() > shiftEnd) continue;
      if (nurse.bookings.some((b) => b.startsAt < end && b.endsAt > start)) continue;

      const key = start.getTime();
      if (!slots.has(key)) slots.set(key, { startsAt: start, endsAt: end, nurses: [] });
      slots.get(key).nurses.push({ ...nurse, dayLoad: nurse.bookings.length });
    }
  }
  return [...slots.values()].sort((a, b) => a.startsAt - b.startsAt);
}

export async function getAvailability({ serviceId, city, day }) {
  const service = await getActiveService(serviceId);
  assertBookableDay(day);
  const slots = await computeSlots({ service, city, day });
  return {
    service,
    slots: slots.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt, nurseCount: s.nurses.length })),
  };
}

export async function bookVisit({ patient, input }) {
  const service = await getActiveService(input.serviceId);
  const city = input.city ?? patient.city;
  const address = input.address ?? patient.address;
  const day = istDay(input.startsAt);
  assertBookableDay(day);

  return prisma.$transaction(async (tx) => {
    const slots = await computeSlots({ service, city, day, db: tx });
    const slot = slots.find((s) => s.startsAt.getTime() === input.startsAt.getTime());
    if (!slot) throw new HttpError(409, "That time is not available. Please pick another.");

    const own = await tx.nurseBooking.findFirst({
      where: {
        patientId: patient.id,
        status: "CONFIRMED",
        startsAt: { lt: slot.endsAt },
        endsAt: { gt: slot.startsAt },
      },
    });
    if (own) throw new HttpError(409, "You already have a nurse visit at this time");

    const prefers = (n) => Number(n.languages.includes(patient.preferredLanguage));
    const ranked = [...slot.nurses].sort(
      (a, b) => prefers(b) - prefers(a) || a.dayLoad - b.dayLoad || b.yearsOfExperience - a.yearsOfExperience
    );

    for (const nurse of ranked) {
      // Lock this nurse so two bookings cannot be checked at the same time.
      await tx.$queryRaw`SELECT id FROM "Nurse" WHERE id = ${nurse.id} FOR UPDATE`;
      const clash = await tx.nurseBooking.findFirst({
        where: {
          nurseId: nurse.id,
          status: "CONFIRMED",
          startsAt: { lt: slot.endsAt },
          endsAt: { gt: slot.startsAt },
        },
      });
      if (clash) continue;

      const booking = await tx.nurseBooking.create({
        data: {
          patientId: patient.id,
          nurseId: nurse.id,
          serviceId: service.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          address,
          city,
          landmark: input.landmark,
          notes: input.notes,
          price: service.price,
        },
        include: bookingInclude,
      });

      await tx.consentRecord.create({
        data: { userId: patient.userId, type: "LOCATION_SHARING", granted: true },
      });
      return booking;
    }

    throw new HttpError(409, "That time was just taken. Please pick another.");
  });
}

export async function cancelVisit({ booking, reason }) {
  if (booking.status !== "CONFIRMED") {
    throw new HttpError(400, "This visit can no longer be cancelled");
  }
  if (booking.startsAt.getTime() - Date.now() < CANCEL_BEFORE_MS) {
    throw new HttpError(400, "Visits can be cancelled up to 2 hours before the start time");
  }
  return prisma.nurseBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason ?? null },
    include: bookingInclude,
  });
}