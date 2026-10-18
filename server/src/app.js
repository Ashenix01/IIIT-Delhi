import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import specializationRoutes from "./routes/specialization.routes.js";
import queryRoutes from "./routes/query.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import nurseRoutes from "./routes/nurse.routes.js";


const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());
if (env.NODE_ENV !== "test") app.use(morgan("dev"));

// Routes
app.use("/auth", apiLimiter, authRoutes);
app.use("/specializations", apiLimiter, specializationRoutes);
app.use("/queries", apiLimiter, queryRoutes);
app.use("/recommendations", apiLimiter, recommendationRoutes);
app.use("/appointments", apiLimiter, appointmentRoutes);
app.use("/doctors", apiLimiter, doctorRoutes);
app.use("/notifications", apiLimiter, notificationRoutes);
app.use("/nurse", apiLimiter, nurseRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;