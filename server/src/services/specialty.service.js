export const SYMPTOM_RULES = [
  { symptom: "headache", keywords: ["headache", "head ache", "migraine", "sir dard", "सिरदर्द", "सिर दर्द"], specialties: ["Neurology", "General Medicine"] },
  { symptom: "fever", keywords: ["fever", "high temperature", "bukhar", "बुखार"], specialties: ["General Medicine"] },
  { symptom: "cough", keywords: ["cough", "khansi", "खांसी", "खाँसी"], specialties: ["Pulmonology", "General Medicine"] },
  { symptom: "cold", keywords: ["common cold", "runny nose", "sneez", "zukam", "जुकाम"], specialties: ["ENT", "General Medicine"] },
  { symptom: "sore throat", keywords: ["sore throat", "throat pain", "gala dard", "गले में दर्द"], specialties: ["ENT"] },
  { symptom: "skin problem", keywords: ["rash", "itching", "itchy", "acne", "pimple", "skin", "खुजली", "दाने"], specialties: ["Dermatology"] },
  { symptom: "stomach pain", keywords: ["stomach", "abdominal", "belly", "pet dard", "पेट"], specialties: ["Gastroenterology", "General Medicine"] },
  { symptom: "diarrhea", keywords: ["diarrhea", "diarrhoea", "loose motion", "दस्त"], specialties: ["Gastroenterology"] },
  { symptom: "vomiting", keywords: ["vomit", "nausea", "उल्टी"], specialties: ["Gastroenterology"] },
  { symptom: "joint or back pain", keywords: ["joint pain", "knee pain", "back pain", "backache", "neck pain", "fracture", "कमर दर्द", "घुटने"], specialties: ["Orthopedics"] },
  { symptom: "breathing difficulty", keywords: ["breath", "wheez", "asthma", "सांस"], specialties: ["Pulmonology"] },
  { symptom: "heart-related symptoms", keywords: ["palpitation", "heartbeat", "blood pressure", "धड़कन"], specialties: ["Cardiology"] },
  { symptom: "anxiety or low mood", keywords: ["anxiety", "anxious", "stress", "depress", "panic", "insomnia", "sleepless", "चिंता", "तनाव", "नींद"], specialties: ["Psychiatry"] },
  { symptom: "eye problem", keywords: ["eye", "vision", "blurry", "आंख", "आँख"], specialties: ["Ophthalmology"] },
  { symptom: "ear problem", keywords: ["ear pain", "earache", "hearing", "कान"], specialties: ["ENT"] },
  { symptom: "menstrual or pregnancy concern", keywords: ["period", "menstrual", "pregnan", "pcod", "पीरियड"], specialties: ["Gynecology"] },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matches(text, keyword) {
  const k = keyword.toLowerCase();
  const isAscii = /^[\x00-\x7F]+$/.test(k);
  return isAscii
    ? new RegExp(`\\b${escapeRe(k)}`, "i").test(text)
    : text.toLowerCase().includes(k);
}

export function matchSymptomRules(text) {
  return SYMPTOM_RULES.filter((rule) => rule.keywords.some((k) => matches(text, k)));
}

export function suggestSpecialtiesFromText(text) {
  const scores = new Map();
  for (const rule of matchSymptomRules(text)) {
    rule.specialties.forEach((name, i) => {
      scores.set(name, (scores.get(name) ?? 0) + (i === 0 ? 2 : 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

// Keeps only specialties that exist in the database. Falls back to General Medicine.
export function resolveSpecialtyNames(suggested, allowedNames) {
  const byLower = new Map(allowedNames.map((n) => [n.toLowerCase(), n]));
  const resolved = [];
  for (const s of suggested ?? []) {
    const match = byLower.get(String(s).trim().toLowerCase());
    if (match && !resolved.includes(match)) resolved.push(match);
  }
  if (resolved.length === 0 && byLower.has("general medicine")) {
    resolved.push(byLower.get("general medicine"));
  }
  return resolved;
}