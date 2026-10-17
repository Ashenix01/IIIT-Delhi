import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPECIALIZATIONS = {
  "General Medicine": ["Family Medicine", "Internal Medicine"],
  Cardiology: ["Interventional Cardiology", "Preventive Cardiology"],
  Dermatology: ["Cosmetic Dermatology", "Pediatric Dermatology"],
  Neurology: ["Headache Medicine", "Epilepsy"],
  Orthopedics: ["Sports Medicine", "Spine Surgery"],
  Pediatrics: ["Neonatology", "Pediatric Allergy"],
  ENT: ["Otology", "Rhinology"],
  Gynecology: ["Obstetrics", "Reproductive Medicine"],
  Gastroenterology: ["Hepatology", "Endoscopy"],
  Pulmonology: ["Sleep Medicine", "Asthma and Allergy"],
  Psychiatry: ["Child Psychiatry", "Anxiety Disorders"],
  Ophthalmology: ["Retina", "Cataract Surgery"],
};

// All doctors below are synthetic demo profiles.
const DOCTORS = [
  { name: "Aarav Mehta", spec: "General Medicine", subs: ["Family Medicine"], years: 12, city: "Delhi", fee: 500, languages: ["en", "hi"], modes: ["ONLINE", "IN_PERSON"] },
  { name: "Neha Kapoor", spec: "General Medicine", subs: ["Internal Medicine"], years: 8, city: "Mumbai", fee: 600, languages: ["en", "hi"], modes: ["ONLINE"] },
  { name: "Rohan Iyer", spec: "Cardiology", subs: ["Preventive Cardiology"], years: 15, city: "Delhi", fee: 1200, languages: ["en"], modes: ["IN_PERSON", "ONLINE"] },
  { name: "Priya Nair", spec: "Dermatology", subs: ["Cosmetic Dermatology"], years: 9, city: "Bengaluru", fee: 800, languages: ["en", "hi"], modes: ["ONLINE", "IN_PERSON"] },
  { name: "Vikram Singh", spec: "Neurology", subs: ["Headache Medicine"], years: 18, city: "Delhi", fee: 1500, languages: ["en", "hi"], modes: ["IN_PERSON"] },
  { name: "Sana Khan", spec: "Orthopedics", subs: ["Sports Medicine"], years: 11, city: "Delhi", fee: 900, languages: ["en", "hi"], modes: ["IN_PERSON", "ONLINE"] },
  { name: "Arjun Rao", spec: "ENT", subs: ["Rhinology"], years: 7, city: "Hyderabad", fee: 700, languages: ["en"], modes: ["ONLINE", "IN_PERSON"] },
  { name: "Meera Joshi", spec: "Gastroenterology", subs: ["Hepatology"], years: 14, city: "Delhi", fee: 1100, languages: ["en", "hi"], modes: ["ONLINE", "IN_PERSON"] },
  { name: "Kabir Sharma", spec: "Pulmonology", subs: ["Asthma and Allergy"], years: 10, city: "Mumbai", fee: 1000, languages: ["en", "hi"], modes: ["ONLINE"] },
  { name: "Ananya Das", spec: "Pediatrics", subs: ["Pediatric Allergy"], years: 13, city: "Delhi", fee: 700, languages: ["en", "hi"], modes: ["IN_PERSON", "ONLINE"] },
];

// Short sample summaries written in our own words, linked to the real MedlinePlus topic pages.
// Replace with reviewed content before any real-world use.
const SOURCES = [
  { title: "Fever (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/fever.html", content: "Fever is a temporary rise in body temperature and is often a sign that the body is fighting an infection. Rest and drinking enough fluids are commonly advised. See a doctor if the fever is very high, lasts more than a few days, or comes with severe headache, stiff neck, rash, confusion, or trouble breathing. Infants with fever need prompt medical attention." },
  { title: "Headache (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/headache.html", content: "Most headaches are not dangerous and have many possible causes such as tension, dehydration, lack of sleep, or migraine. Seek urgent care for a sudden severe headache, a headache after a head injury, or a headache with fever and stiff neck, weakness, vision changes, or confusion. See a doctor if headaches are frequent, getting worse, or affecting daily life." },
  { title: "Common cold (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/commoncold.html", content: "Colds are usually caused by viruses and often improve within one to two weeks. Rest and fluids are commonly recommended. See a doctor if symptoms last longer than expected, or if there is shortness of breath, chest pain, or a high fever." },
  { title: "Cough (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/cough.html", content: "Coughs are often caused by viral infections and usually settle within a few weeks. See a doctor if a cough lasts more than three weeks, or if there is shortness of breath, chest pain, coughing up blood, or high fever." },
  { title: "Chest pain (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/chestpain.html", content: "Chest pain can have many causes, some of them serious. Chest pain with shortness of breath, sweating, pain spreading to the arm or jaw, or fainting needs emergency care immediately. Any new, unexplained, or persistent chest pain should be evaluated by a healthcare professional." },
  { title: "Abdominal pain (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/abdominalpain.html", content: "Stomach pain has many causes, most of them minor. Seek urgent care for severe pain, pain with fever, repeated vomiting, blood in stool or vomit, or a hard swollen abdomen. See a doctor if mild pain lasts more than a few days." },
  { title: "Diarrhea (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/diarrhea.html", content: "Diarrhea is often caused by infection and usually improves in a few days. Drinking enough fluids to prevent dehydration is important. See a doctor if it lasts more than a couple of days, or comes with blood, high fever, severe pain, or signs of dehydration such as very dark urine, dizziness, or dry mouth." },
  { title: "Back pain (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/backpain.html", content: "Most back pain improves within a few weeks, and staying gently active is often advised. See a doctor if pain follows an injury, lasts more than a few weeks, or comes with numbness or leg weakness. Loss of bladder or bowel control with back pain needs urgent care." },
  { title: "Rashes (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/rashes.html", content: "Rashes have many causes, including allergies, infections, and skin conditions. See a doctor for a rash that is widespread, painful, blistering, spreading quickly, or comes with fever. Seek urgent care for a rash with swelling of the face or lips or difficulty breathing." },
  { title: "Anxiety (sample summary, see MedlinePlus)", url: "https://medlineplus.gov/anxiety.html", content: "Feeling anxious or stressed is common. See a healthcare professional if worry is persistent or interferes with daily life. If you have thoughts of harming yourself, contact emergency services or a crisis helpline right away." },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function main() {
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  // Specializations and sub-specializations
  const specMap = {};
  for (const [name, subs] of Object.entries(SPECIALIZATIONS)) {
    const spec = await prisma.specialization.upsert({
      where: { name },
      update: {},
      create: { name, slug: slug(name) },
    });
    specMap[name] = spec;
    for (const sub of subs) {
      await prisma.subSpecialization.upsert({
        where: { specializationId_name: { specializationId: spec.id, name: sub } },
        update: {},
        create: { name: sub, specializationId: spec.id },
      });
    }
  }

  // Demo doctors with availability
  for (const [i, d] of DOCTORS.entries()) {
    const n = i + 1;
    const email = `demo.doctor${n}@healthbridge.demo`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, role: "DOCTOR" },
    });

    const spec = specMap[d.spec];
    const subs = await prisma.subSpecialization.findMany({
      where: { specializationId: spec.id, name: { in: d.subs } },
    });

    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: d.name,
        phone: `+91-90000-000${String(n).padStart(2, "0")}`,
        specializationId: spec.id,
        yearsOfExperience: d.years,
        clinicName: "Demo Clinic",
        address: `Demo Clinic, Sector ${n}`,
        city: d.city,
        consultationFee: d.fee,
        consultationModes: d.modes,
        languages: d.languages,
        bio: "Demonstration profile. Not a real doctor.",
        registrationNumber: `DEMO-${1000 + n}`,
        licensingAuthority: "Demo Authority",
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        isDemo: true,
        subSpecializations: { connect: subs.map((s) => ({ id: s.id })) },
        qualifications: {
          create: [{ degree: "MBBS", institution: "Demo Medical College", year: 2005 + (n % 5), isVerified: true }],
        },
      },
    });

    // Fresh unbooked slots for the next 5 days
    await prisma.availabilitySlot.deleteMany({
      where: { doctorId: doctor.id, appointment: { is: null } },
    });
    const slots = [];
    for (let day = 1; day <= 5; day++) {
      for (const hour of [10, 11, 16]) {
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + day);
        startsAt.setHours(hour, 0, 0, 0);
        slots.push({
          doctorId: doctor.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
          mode: d.modes[(day + hour) % d.modes.length],
        });
      }
    }
    await prisma.availabilitySlot.createMany({ data: slots, skipDuplicates: true });
  }

  // Demo patient (synthetic)
  const patientUser = await prisma.user.upsert({
    where: { email: "patient@healthbridge.demo" },
    update: {},
    create: { email: "patient@healthbridge.demo", passwordHash, role: "PATIENT" },
  });
  const existingPatient = await prisma.patient.findUnique({ where: { userId: patientUser.id } });
  if (!existingPatient) {
    await prisma.patient.create({
      data: {
        userId: patientUser.id,
        name: "Demo Patient",
        phone: "+91-98000-00000",
        address: "123 Demo Street",
        city: "Delhi",
        preferredLanguage: "en",
        conditions: { create: [{ name: "Seasonal allergies", notes: "Synthetic demo data" }] },
      },
    });
  }

  // Knowledge base for guidance
  for (const s of SOURCES) {
    const source = await prisma.medicalSource.upsert({
      where: { url: s.url },
      update: { title: s.title },
      create: { title: s.title, organization: "MedlinePlus (U.S. National Library of Medicine)", url: s.url },
    });
    await prisma.medicalChunk.deleteMany({ where: { sourceId: source.id } });
    await prisma.medicalChunk.create({
      data: { sourceId: source.id, content: s.content, chunkIndex: 0 },
    });
  }

  console.log("Seed complete.");
  console.log("Demo logins (password Demo@1234): patient@healthbridge.demo, demo.doctor1@healthbridge.demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());