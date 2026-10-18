import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  notifyAppointmentBooked,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  scheduleAppointmentReminders,
  clearAppointmentReminders,
} from "../services/notification.service.js";

export const MIN_LEAD_MS = 15 * 60 * 1000;
const PATIENT_CANCEL_BEFORE_MS = 2 * 60 * 60 * 1000;
const JOIN_EARLY_MS = 10 * 60 * 1000;
const JOIN_LATE_MS = 15 * 60 * 1000;
const ACTIVE = ["PENDING", "CONFIRMED"];
const SLOT_TAKEN = "That slot was just booked. Please pick another.";

export const appointmentInclude = {
  doctor: {
    select: {
      id: true,
      name: true,
      clinicName: true,
      address: true,
      city: true,
      consultationFee: true,
      isDemo: true,
      specialization: { select: { name: true } },
    },
  },
  patient: { select: { id: true, name: true, city: true, preferredLanguage: true } },
};

function buildMeeting() {
  const room = `HealthBridge-${crypto.randomBytes(8).toString("hex")}`;
  return { meetingRoom: room, meetingUrl: `${env.JITSI_BASE_URL}/${room}` };
}

export function joinWindow(a) {
  return {
    opensAt: new Date(a.startsAt.getTime() - JOIN_EARLY_MS),
    closesAt: new Date(a.endsAt.getTime() + JOIN_LATE_MS),
  };
}

export function serialize(a, role, now = new Date()) {
  const { opensAt, closesAt } = joinWindow(a);
  const canJoin =
    a.mode === "ONLINE" && a.status === "CONFIRMED" && now >= opensAt && now <= closesAt;

  return {
    id: a.id,
    status: a.status,
    mode: a.mode,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    reason: a.reason,
    shareSummaryWithDoctor: a.shareSummaryWithDoctor,
    cancelledAt: a.cancelledAt,
    cancelledBy: a.cancelledBy,
    cancelReason: a.cancelReason,
    createdAt: a.createdAt,
    doctor: {
      ...a.doctor,
      specialization: a.doctor.specialization.name,
      consultationFee: Number(a.doctor.consultationFee),
    },
    patient: role === "DOCTOR" ? a.patient : undefined,
    online: a.mode === "ONLINE" ? { canJoin, opensAt, closesAt } : null,
  };
}

// Checks a slot can be booked by this patient. Runs inside a transaction.
async function reserve(tx, { patientId, slotId, excludeId }) {
  const slot = await tx.availabilitySlot.findUnique({
    where: { id: slotId },
    include: { doctor: true, appointment: true },
  });
  if (!slot) throw new HttpError(404, "Slot not found");
  if (slot.doctor.verificationStatus !== "VERIFIED") {
    throw new HttpError(400, "This doctor is not available for booking");
  }
  if (slot.appointment) throw new HttpError(409, SLOT_TAKEN);
  if (slot.startsAt.getTime() < Date.now() + MIN_LEAD_MS) {
    throw new HttpError(400, "That slot is too soon or already in the past");
  }

  const clash = await tx.appointment.findFirst({
    where: {
      patientId,
      status: { in: ACTIVE },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startsAt: { lt: slot.endsAt },
      endsAt: { gt: slot.startsAt },
    },
  });
  if (clash) throw new HttpError(409, "You already have an appointment at this time");

  return slot;
}

const isUniqueError = (err) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export async function createAppointment({ patient, slotId, reason, healthQueryId, shareSummaryWithDoctor }) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (healthQueryId) {
        const q = await tx.healthQuery.findUnique({ where: { id: healthQueryId } });
        if (!q || q.patientId !== patient.id) throw new HttpError(404, "Query not found");
      }

      const slot = await reserve(tx, { patientId: patient.id, slotId });

      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: slot.doctorId,
          slotId: slot.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          mode: slot.mode,
          status: "CONFIRMED",
          reason,
          healthQueryId,
          shareSummaryWithDoctor,
          ...(slot.mode === "ONLINE" ? buildMeeting() : {}),
        },
        include: appointmentInclude,
      });

      // The patient's "doctors" list grows when they book.
      await tx.patient.update({
        where: { id: patient.id },
        data: { doctors: { connect: { id: slot.doctorId } } },
      });

      if (shareSummaryWithDoctor) {
        await tx.consentRecord.create({
          data: { userId: patient.userId, type: "SHARE_SUMMARY_WITH_DOCTOR", granted: true },
        });
      }

      return appointment;
    });
  } catch (err) {
    if (isUniqueError(err)) throw new HttpError(409, SLOT_TAKEN);
    throw err;
  }
}

function assertPatientMayChange(appt) {
  if (!ACTIVE.includes(appt.status)) {
    throw new HttpError(400, "This appointment can no longer be changed");
  }
  if (appt.startsAt.getTime() - Date.now() < PATIENT_CANCEL_BEFORE_MS) {
    throw new HttpError(
      400,
      "Appointments can be changed up to 2 hours before the start time. Please contact the doctor."
    );
  }
}

export async function rescheduleAppointment({ appt, patient, slotId }) {
  assertPatientMayChange(appt);
  try {
    return await prisma.$transaction(async (tx) => {
      const slot = await reserve(tx, { patientId: patient.id, slotId, excludeId: appt.id });
      if (slot.doctorId !== appt.doctorId) {
        throw new HttpError(400, "Choose a slot with the same doctor");
      }

      // Moving the appointment to the new slot frees the old one.
      return tx.appointment.update({
        where: { id: appt.id },
        data: {
          slotId: slot.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          mode: slot.mode,
          ...(slot.mode === "ONLINE"
            ? appt.meetingUrl
              ? {}
              : buildMeeting()
            : { meetingRoom: null, meetingUrl: null }),
        },
        include: appointmentInclude,
      });
    });
  } catch (err) {
    if (isUniqueError(err)) throw new HttpError(409, SLOT_TAKEN);
    throw err;
  }
}

export async function cancelAppointment({ appt, role, reason }) {
  if (!ACTIVE.includes(appt.status)) {
    throw new HttpError(400, "This appointment can no longer be cancelled");
  }
  if (appt.startsAt.getTime() <= Date.now()) {
    throw new HttpError(400, "This appointment has already started");
  }
  if (role === "PATIENT") assertPatientMayChange(appt);

  return prisma.$transaction(async (tx) => {
    const slotId = appt.slotId;
    const updated = await tx.appointment.update({
      where: { id: appt.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: role,
        cancelReason: reason ?? null,
        slotId: null, // frees the slot
      },
      include: appointmentInclude,
    });
    // If the doctor cancels, the slot is removed so it is not offered again.
    if (role === "DOCTOR" && slotId) {
      await tx.availabilitySlot.delete({ where: { id: slotId } });
    }
    return updated;
  });
}

export async function finishAppointment({ appt, status }) {
  if (appt.status !== "CONFIRMED") {
    throw new HttpError(400, "Only confirmed appointments can be updated");
  }
  if (appt.startsAt.getTime() > Date.now()) {
    throw new HttpError(400, "You can update the status once the appointment has started");
  }
  return prisma.appointment.update({
    where: { id: appt.id },
    data: { status },
    include: appointmentInclude,
  });
}