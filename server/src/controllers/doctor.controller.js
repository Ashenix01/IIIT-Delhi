import { prisma } from "../config/prisma.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import { MIN_LEAD_MS } from "../services/appointment.service.js";

// GET /api/v1/doctors/:id
export const getDoctor = asyncHandler(async (req, res) => {
  const earliest = new Date(Date.now() + MIN_LEAD_MS);

  const d = await prisma.doctor.findFirst({
    where: { id: req.params.id, verificationStatus: "VERIFIED" },
    include: {
      specialization: true,
      subSpecializations: true,
      qualifications: true,
      slots: {
        where: { startsAt: { gt: earliest }, appointment: { is: null } },
        orderBy: { startsAt: "asc" },
        take: 60,
      },
    },
  });
  if (!d) throw new HttpError(404, "Doctor not found");

  res.json({
    doctor: {
      id: d.id,
      name: d.name,
      specialization: d.specialization.name,
      subSpecializations: d.subSpecializations.map((s) => s.name),
      yearsOfExperience: d.yearsOfExperience,
      clinicName: d.clinicName,
      address: d.address,
      city: d.city,
      consultationFee: Number(d.consultationFee),
      consultationModes: d.consultationModes,
      languages: d.languages,
      bio: d.bio,
      photoUrl: d.photoUrl,
      qualifications: d.qualifications.map((q) => ({
        degree: q.degree,
        institution: q.institution,
        year: q.year,
      })),
      verified: true,
      isDemo: d.isDemo,
    },
    slots: d.slots.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt, mode: s.mode })),
  });
}); 