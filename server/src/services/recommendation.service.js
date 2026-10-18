import { prisma } from "../config/prisma.js";
import { SYMPTOM_RULES, matchSymptomRules } from "./specialty.service.js";

export const CRITERIA = [
  "Specialty matches the symptoms you confirmed (up to 40 points)",
  "Speaks your language (15)",
  "Earliest open slot (up to 15)",
  "Same city as you, for in-person visits (15)",
  "Lower consultation fee (up to 10)",
  "Years of experience (up to 5)",
];

const LANG_NAMES = { en: "English", hi: "Hindi" };

const formatSlot = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);

const modeLabel = (m) => (m === "ONLINE" ? "online" : "in person");

// Rules that apply to the patient's confirmed symptoms.
export function rulesForSymptoms(symptoms, transcript) {
  const found = new Set();
  for (const s of symptoms) {
    const lower = String(s).trim().toLowerCase();
    SYMPTOM_RULES.forEach((rule) => rule.symptom === lower && found.add(rule));
    matchSymptomRules(s).forEach((rule) => found.add(rule));
  }
  if (found.size === 0) matchSymptomRules(transcript).forEach((rule) => found.add(rule));
  return [...found];
}

// Fixed symptom-to-specialty table. Returns up to 3 specialties, best first.
export function mapSpecialties(rules) {
  const scores = new Map();
  for (const rule of rules) {
    rule.specialties.forEach((name, i) => {
      const entry = scores.get(name) ?? { score: 0, symptoms: new Set() };
      entry.score += i === 0 ? 2 : 1;
      entry.symptoms.add(rule.symptom);
      scores.set(name, entry);
    });
  }
  const list = [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([name, e]) => ({ name, symptoms: [...e.symptoms] }));
  return list.length > 0 ? list : [{ name: "General Medicine", symptoms: [] }];
}

function availabilityPoints(hours) {
  if (hours <= 24) return 15;
  if (hours <= 48) return 10;
  if (hours <= 96) return 6;
  return 3;
}

function scoreDoctor(d, ctx) {
  const reasons = [];
  let score = 0;

  const rank = ctx.specialties.findIndex((s) => s.name === d.specialization.name);
  const spec = ctx.specialties[rank];
  score += rank === 0 ? 40 : 25;
  reasons.push(
    spec.symptoms.length > 0
      ? `${d.specialization.name} is listed for ${spec.symptoms.join(", ")}`
      : `${d.specialization.name} is a good first stop when the cause is unclear`
  );

  if (d.languages.includes(ctx.language)) {
    score += 15;
    reasons.push(`Speaks ${LANG_NAMES[ctx.language] ?? ctx.language}`);
  }

  const first = d.slots[0];
  const hours = (first.startsAt.getTime() - ctx.now.getTime()) / 3600000;
  score += availabilityPoints(hours);
  reasons.push(`First open slot: ${formatSlot(first.startsAt)} (${modeLabel(first.mode)})`);

  const sameCity =
    ctx.city && d.city.trim().toLowerCase() === ctx.city.trim().toLowerCase();
  if (sameCity && ctx.mode !== "ONLINE" && d.consultationModes.includes("IN_PERSON")) {
    score += 15;
    reasons.push(`In your city: ${d.city}`);
  }

  const fee = Number(d.consultationFee);
  if (ctx.maxFee != null) {
    score += 10;
    reasons.push(`Fee Rs ${fee}, within your budget`);
  } else {
    const range = ctx.feeMax - ctx.feeMin;
    score += range === 0 ? 5 : Math.round((10 * (ctx.feeMax - fee)) / range);
    reasons.push(`Fee Rs ${fee}`);
  }

  score += Math.round((Math.min(d.yearsOfExperience, 20) / 20) * 5);
  reasons.push(`${d.yearsOfExperience} years of experience`);

  return { score, reasons };
}

export async function findRecommendations({ specialties, language, city, mode, maxFee, limit }) {
  const now = new Date();

  const specRows = await prisma.specialization.findMany({
    where: { name: { in: specialties.map((s) => s.name) } },
    select: { id: true, name: true },
  });

  const slotFilter = {
    startsAt: { gt: now },
    appointment: { is: null },
    ...(mode ? { mode } : {}),
  };

  const doctors = await prisma.doctor.findMany({
    where: {
      verificationStatus: "VERIFIED",
      specializationId: { in: specRows.map((s) => s.id) },
      ...(mode ? { consultationModes: { has: mode } } : {}),
      ...(maxFee != null ? { consultationFee: { lte: maxFee } } : {}),
      slots: { some: slotFilter },
    },
    include: {
      specialization: true,
      subSpecializations: true,
      qualifications: true,
      slots: { where: slotFilter, orderBy: { startsAt: "asc" }, take: 3 },
    },
  });

  const fees = doctors.map((d) => Number(d.consultationFee));
  const ctx = {
    specialties,
    language,
    city,
    mode,
    maxFee,
    now,
    feeMin: Math.min(...fees),
    feeMax: Math.max(...fees),
  };

  const matches = doctors
    .map((d) => ({ d, ...scoreDoctor(d, ctx) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.d.slots[0].startsAt - b.d.slots[0].startsAt ||
        b.d.yearsOfExperience - a.d.yearsOfExperience
    )
    .slice(0, limit)
    .map(({ d, score, reasons }, i) => ({
      rank: i + 1,
      score,
      reasons,
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
      nextSlots: d.slots.map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        mode: s.mode,
      })),
    }));

  return { matches, specRows };
}