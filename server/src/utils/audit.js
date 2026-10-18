import { prisma } from "../config/prisma.js";

export async function audit(userId, ip, action, entityType = null, entityId = null) {
  try {
    await prisma.auditLog.create({
      data: { userId, ipAddress: ip, action, entityType, entityId },
    });
  } catch {
    console.error("Audit log failed");
  }
}