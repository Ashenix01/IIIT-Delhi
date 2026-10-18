import { prisma } from "../config/prisma.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import {
  CRITERIA,
  rulesForSymptoms,
  mapSpecialties,
  findRecommendations,
} from "../services/recommendation.service.js";
import { audit } from "../utils/audit.js";

// POST /api/v1/recommendations
export const recommend = asyncHandler(async (req, res) => {
  const patient = req.user.patient;
  const { queryId, mode, maxFee, limit } = req.body;

  const query = await prisma.healthQuery.findUnique({ where: { id: queryId } });
  if (!query || query.patientId !== patient.id) throw new HttpError(404, "Query not found");

  if (query.emergencyFlag) {
    throw new HttpError(400, "This query was flagged for urgent care. Please seek urgent medical help.");
  }
  if (!query.extractionConfirmedAt || !query.extractedData) {
    throw new HttpError(400, "Please confirm your details before viewing doctors");
  }

  const symptoms = query.extractedData.symptoms ?? [];
  const specialties = mapSpecialties(rulesForSymptoms(symptoms, query.transcript));

  const { matches, specRows } = await findRecommendations({
    specialties,
    language: query.language,
    city: patient.city,
    mode,
    maxFee,
    limit,
  });

  // Save the result so it appears in the patient's history.
  const idByName = new Map(specRows.map((s) => [s.name, s.id]));
  await prisma.$transaction([
    prisma.doctorRecommendation.deleteMany({ where: { healthQueryId: query.id } }),
    prisma.querySpecialtySuggestion.deleteMany({ where: { healthQueryId: query.id } }),
    prisma.querySpecialtySuggestion.createMany({
      data: specialties
        .filter((s) => idByName.has(s.name))
        .map((s) => ({
          healthQueryId: query.id,
          specializationId: idByName.get(s.name),
          reason: s.symptoms.length > 0 ? `Listed for ${s.symptoms.join(", ")}` : "General first stop",
        })),
    }),
    prisma.doctorRecommendation.createMany({
      data: matches.map((m) => ({
        healthQueryId: query.id,
        doctorId: m.doctor.id,
        rank: m.rank,
        score: m.score,
        reasons: m.reasons,
      })),
    }),
  ]);

  await audit(req.user.id, req.ip, "RECOMMENDATIONS_VIEWED", "HealthQuery", query.id);

  res.json({
    queryId: query.id,
    specialties,
    matches,
    criteria: CRITERIA,
    note: "Doctors are ranked by the fixed criteria above. This is a guide to help you choose, not a medical opinion.",
    emptyMessage:
      matches.length === 0
        ? "No verified doctors have open slots for these specialties yet. Try changing the consultation mode or budget."
        : null,
  });
});