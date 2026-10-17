import { prisma } from "../config/prisma.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import { screenForEmergency } from "../services/safety.service.js";
import { extractInformation } from "../services/extraction.service.js";
import { resolveSpecialtyNames } from "../services/specialty.service.js";
import { audit } from "../utils/audit.js";

const DISCLAIMER = "AI-generated from what you told us. This is not a diagnosis.";

async function getSpecialtyNames() {
  const rows = await prisma.specialization.findMany({ select: { name: true } });
  return rows.map((r) => r.name);
}

// Loads a query and makes sure it belongs to the logged-in patient.
async function getOwnQuery(req) {
  const patient = req.user.patient;
  if (!patient) throw new HttpError(403, "Patient account required");

  const query = await prisma.healthQuery.findUnique({ where: { id: req.params.id } });
  if (!query || query.patientId !== patient.id) throw new HttpError(404, "Query not found");
  return query;
}

// POST /api/v1/queries/extract
export const extractQuery = asyncHandler(async (req, res) => {
  const { transcript, language, inputMode } = req.body;
  const patient = req.user.patient;

  // 1. Rule-based safety screen runs first, before any AI.
  const safety = screenForEmergency(transcript);
  if (safety.isEmergency) {
    const query = await prisma.healthQuery.create({
      data: {
        patientId: patient.id,
        inputMode,
        language,
        transcript,
        urgencyLevel: "EMERGENCY",
        emergencyFlag: true,
      },
    });
    await audit(req.user.id, req.ip, "QUERY_EMERGENCY_FLAGGED", "HealthQuery", query.id);
    return res.status(201).json({
      queryId: query.id,
      emergency: true,
      safety: { category: safety.category, message: safety.message[language] },
    });
  }

  // 2. Structured extraction (LLM if configured, otherwise rules).
  const allowedSpecialties = await getSpecialtyNames();
  const { data, source } = await extractInformation({ transcript, language, allowedSpecialties });

  const query = await prisma.healthQuery.create({
    data: {
      patientId: patient.id,
      inputMode,
      language,
      transcript,
      extractedData: data,
    },
  });

  await audit(req.user.id, req.ip, "QUERY_CREATED", "HealthQuery", query.id);
  res.status(201).json({
    queryId: query.id,
    emergency: false,
    extraction: data,
    extractionSource: source,
    disclaimer: DISCLAIMER,
  });
});

// POST /api/v1/queries/:id/confirm
export const confirmQuery = asyncHandler(async (req, res) => {
  const query = await getOwnQuery(req);

  if (query.emergencyFlag) {
    throw new HttpError(400, "This query was flagged for urgent care. Please seek urgent medical help.");
  }

  const { extraction } = req.body;

  // Re-screen: the patient may have edited the extracted symptoms.
  const safety = screenForEmergency(`${query.transcript}\n${extraction.symptoms.join(". ")}`);
  if (safety.isEmergency) {
    await prisma.healthQuery.update({
      where: { id: query.id },
      data: { urgencyLevel: "EMERGENCY", emergencyFlag: true },
    });
    return res.json({
      queryId: query.id,
      emergency: true,
      safety: { category: safety.category, message: safety.message[query.language] ?? safety.message.en },
    });
  }

  const allowedSpecialties = await getSpecialtyNames();
  extraction.suggestedSpecialties = resolveSpecialtyNames(extraction.suggestedSpecialties, allowedSpecialties);

  await prisma.healthQuery.update({
    where: { id: query.id },
    data: {
      extractedData: extraction,
      extractionConfirmedAt: new Date(),
      urgencyLevel: extraction.severity === "severe" ? "SOON" : "ROUTINE",
    },
  });

  await audit(req.user.id, req.ip, "QUERY_CONFIRMED", "HealthQuery", query.id);
  res.json({
    queryId: query.id,
    emergency: false,
    confirmed: true,
    extraction,
    specialties: extraction.suggestedSpecialties,
  });
});

// GET /api/v1/queries
export const listQueries = asyncHandler(async (req, res) => {
  const queries = await prisma.healthQuery.findMany({
    where: { patientId: req.user.patient.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      transcript: true,
      language: true,
      urgencyLevel: true,
      emergencyFlag: true,
      extractionConfirmedAt: true,
      createdAt: true,
    },
  });

  res.json({
    queries: queries.map((q) => ({
      ...q,
      transcript: q.transcript.length > 120 ? `${q.transcript.slice(0, 120)}...` : q.transcript,
    })),
  });
});

// GET /api/v1/queries/:id
export const getQuery = asyncHandler(async (req, res) => {
  const query = await getOwnQuery(req);
  res.json({
    query: {
      id: query.id,
      transcript: query.transcript,
      language: query.language,
      inputMode: query.inputMode,
      extraction: query.extractedData,
      confirmed: Boolean(query.extractionConfirmedAt),
      urgencyLevel: query.urgencyLevel,
      emergency: query.emergencyFlag,
      createdAt: query.createdAt,
    },
  });
});