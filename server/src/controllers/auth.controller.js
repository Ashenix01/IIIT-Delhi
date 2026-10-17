import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";
import { audit } from "../utils/audit.js";

// Used so a missing account takes as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  profile: user.role === "PATIENT" ? user.patient : user.doctor,
});

// POST /api/v1/auth/patient/register
export const registerPatient = asyncHandler(async (req, res) => {
  const b = req.body;

  const existing = await prisma.user.findUnique({ where: { email: b.email } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(b.password, 10);

  const user = await prisma.user.create({
    data: {
      email: b.email,
      passwordHash,
      role: "PATIENT",
      patient: {
        create: {
          name: b.name,
          phone: b.phone,
          address: b.address,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
          dateOfBirth: b.dateOfBirth,
          gender: b.gender,
          preferredLanguage: b.preferredLanguage,
        },
      },
      consents: {
        create: [
          { type: "TERMS", granted: true },
          { type: "HEALTH_DATA_PROCESSING", granted: true },
        ],
      },
    },
    include: { patient: true, doctor: true },
  });

  setAuthCookie(res, signToken(user));
  await audit(user.id, req.ip, "PATIENT_REGISTERED", "User", user.id);
  res.status(201).json({ user: toPublicUser(user) });
});

// POST /api/v1/auth/doctor/register
export const registerDoctor = asyncHandler(async (req, res) => {
  const b = req.body;

  const existing = await prisma.user.findUnique({ where: { email: b.email } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const specialization = await prisma.specialization.findUnique({
    where: { id: b.specializationId },
  });
  if (!specialization) throw new HttpError(400, "Unknown specialization");

  if (b.subSpecializationIds.length > 0) {
    const validSubs = await prisma.subSpecialization.count({
      where: { id: { in: b.subSpecializationIds }, specializationId: specialization.id },
    });
    if (validSubs !== b.subSpecializationIds.length) {
      throw new HttpError(400, "One or more sub-specializations do not belong to this specialization");
    }
  }

  const passwordHash = await bcrypt.hash(b.password, 10);

  const user = await prisma.user.create({
    data: {
      email: b.email,
      passwordHash,
      role: "DOCTOR",
      doctor: {
        create: {
          name: b.name,
          phone: b.phone,
          specializationId: specialization.id,
          yearsOfExperience: b.yearsOfExperience,
          clinicName: b.clinicName,
          address: b.address,
          city: b.city,
          state: b.state,
          consultationFee: b.consultationFee,
          consultationModes: b.consultationModes,
          languages: b.languages,
          bio: b.bio,
          registrationNumber: b.registrationNumber,
          licensingAuthority: b.licensingAuthority,
          // verificationStatus defaults to PENDING
          subSpecializations: { connect: b.subSpecializationIds.map((id) => ({ id })) },
          qualifications: { create: b.qualifications },
        },
      },
    },
    include: { patient: true, doctor: true },
  });

  setAuthCookie(res, signToken(user));
  await audit(user.id, req.ip, "DOCTOR_REGISTERED", "User", user.id);
  res.status(201).json({
    user: toPublicUser(user),
    message: "Registered. Your profile will be visible to patients after credential verification.",
  });
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { patient: true, doctor: true },
  });

  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) {
    throw new HttpError(401, "Invalid email or password");
  }

  setAuthCookie(res, signToken(user));
  await audit(user.id, req.ip, "LOGIN", "User", user.id);
  res.json({ user: toPublicUser(user) });
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

// GET /api/v1/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});