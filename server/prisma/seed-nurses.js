import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const AUTHORITY = "Demo Nursing Council";

const SERVICES = [
  { slug: "injection", name: "Injection administration", description: "A nurse gives an injection that your doctor has prescribed.", durationMinutes: 30, price: 250, patientNote: "Keep the doctor's prescription and the medicine ready. Nurses do not prescribe or supply medicines." },
  { slug: "dressing", name: "Wound dressing change", description: "A nurse cleans and re-dresses a wound as advised by your doctor.", durationMinutes: 30, price: 300, patientNote: "Keep any dressing materials your doctor advised ready." },
  { slug: "bp-check", name: "Blood pressure check", description: "A blood pressure and pulse reading at home.", durationMinutes: 20, price: 150, patientNote: null },
  { slug: "sugar-check", name: "Blood sugar check", description: "A finger-prick blood sugar reading at home.", durationMinutes: 20, price: 150, patientNote: "Tell the nurse if your doctor asked for a fasting reading." },
  { slug: "vitals-check", name: "Vitals check", description: "Temperature, pulse, blood pressure and oxygen level.", durationMinutes: 30, price: 250, patientNote: null },
];

const ALL = SERVICES.map((s) => s.slug);

const NURSES = [
  { name: "Sunita Verma", city: "Delhi", years: 9, qualification: "B.Sc Nursing", languages: ["en", "hi"], start: 9, end: 18, services: ALL },
  { name: "Ravi Kumar", city: "Delhi", years: 6, qualification: "GNM", languages: ["hi"], start: 8, end: 17, services: ["injection", "bp-check", "sugar-check", "vitals-check"] },
  { name: "Pooja Sharma", city: "Delhi", years: 12, qualification: "B.Sc Nursing", languages: ["en", "hi"], start: 10, end: 19, services: ["injection", "dressing", "vitals-check"] },
  { name: "Anita Desai", city: "Mumbai", years: 8, qualification: "GNM", languages: ["en", "hi"], start: 9, end: 18, services: ALL },
  { name: "Lakshmi Nair", city: "Bengaluru", years: 10, qualification: "B.Sc Nursing", languages: ["en"], start: 9, end: 18, services: ALL },
  { name: "Farhan Ali", city: "Hyderabad", years: 7, qualification: "GNM", languages: ["en", "hi"], start: 9, end: 18, services: ALL },
];

async function main() {
  const idBySlug = new Map();
  for (const s of SERVICES) {
    const row = await prisma.nurseServiceType.upsert({
      where: { slug: s.slug },
      update: { name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price, patientNote: s.patientNote },
      create: s,
    });
    idBySlug.set(s.slug, row.id);
  }

  for (const [i, n] of NURSES.entries()) {
    const registrationNumber = `DEMO-N-${1001 + i}`;
    const serviceIds = n.services.map((slug) => ({ id: idBySlug.get(slug) }));
    await prisma.nurse.upsert({
      where: { registrationNumber_licensingAuthority: { registrationNumber, licensingAuthority: AUTHORITY } },
      update: { services: { set: serviceIds } },
      create: {
        name: n.name,
        phone: `+91-90000-1${String(i + 1).padStart(4, "0")}`,
        city: n.city,
        yearsOfExperience: n.years,
        qualification: n.qualification,
        registrationNumber,
        licensingAuthority: AUTHORITY,
        languages: n.languages,
        workStartHour: n.start,
        workEndHour: n.end,
        verificationStatus: "VERIFIED",
        isDemo: true,
        services: { connect: serviceIds },
      },
    });
  }

  console.log("Nurse demo data ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());