// src/app.ts (Remove the listen call—export only for server.ts to handle)
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import { errorHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import routes from "./routes";
import { ensureBootstrapAdmin } from "./utils/bootstrapAdmin";
import { ensureDefaultRoles } from "./utils/seedRoles";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB, then bootstrap admin
connectDB().then(async () => {
  if (process.env.NODE_ENV !== "production") {
    await ensureBootstrapAdmin();
    await ensureDefaultRoles();
  }
  console.log('✅ MongoDB connected and bootstrapped');
});

// ✅ Swagger setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// ✅ Mount API routes
app.use("/api", routes);

// ✅ Global error handler (catches all async errors)
app.use(errorHandler);

// ✅ Global uncaught exception handler (prevents server crash)
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  // Log to service (e.g., Sentry) in production
  if (process.env.NODE_ENV === 'production') {
    // Graceful shutdown or restart logic here
  }
  process.exit(1); // Exit after logging
});

// ✅ Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to service in production
  if (process.env.NODE_ENV === 'production') {
    // Graceful handling
  }
  // Don't exit on rejection in dev for easier debugging
});

export default app; // Export app—don't listen here