import { z } from "zod";

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8, "Password must be at least 8 characters").max(72);
const phone = z.string().trim().min(7).max(20);
const mustBeTrue = (message) => z.literal(true, { errorMap: () => ({ message }) });

export const patientRegisterSchema = z.object({
  email,
  password,
  name: z.string().trim().min(2).max(100),
  phone,
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(12).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  preferredLanguage: z.enum(["en", "hi"]).default("en"),
  consentTerms: mustBeTrue("You must accept the terms"),
  consentHealthData: mustBeTrue("Consent to health data processing is required"),
});

export const doctorRegisterSchema = z.object({
  email,
  password,
  name: z.string().trim().min(2).max(100),
  phone,
  specializationId: z.string().min(1),
  subSpecializationIds: z.array(z.string()).default([]),
  yearsOfExperience: z.coerce.number().int().min(0).max(70),
  clinicName: z.string().trim().max(150).optional(),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional(),
  consultationFee: z.coerce.number().min(0).max(100000),
  consultationModes: z.array(z.enum(["ONLINE", "IN_PERSON"])).min(1),
  languages: z.array(z.string().trim().min(2).max(10)).min(1),
  bio: z.string().trim().max(1000).optional(),
  registrationNumber: z.string().trim().min(3).max(50),
  licensingAuthority: z.string().trim().min(2).max(100),
  qualifications: z
    .array(
      z.object({
        degree: z.string().trim().min(2).max(100),
        institution: z.string().trim().min(2).max(150),
        year: z.coerce.number().int().min(1950).max(2100).optional(),
      })
    )
    .default([]),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});