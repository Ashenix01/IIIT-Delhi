import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import app from "./app.js";
import { startReminderJob } from "./services/notification.service.js";

const server = app.listen(env.PORT, () => {
  console.log(`HealthBridge API running on http://localhost:${env.PORT}`);
});

const reminderTimer = startReminderJob();

async function shutdown() {
  clearInterval(reminderTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);