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

const envAllowed =
  (process.env.ALLOWED_ORIGINS || process.env.APP_BASE_URL || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

// sensible local defaults for dev; keep or remove as you like
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173", // Vite default
  "http://localhost:5174", // your current dev port
  "https://winners-ow7o.onrender.com/", // CRA/Next
];

const ALLOWED_ORIGINS = [...new Set([...DEFAULT_DEV_ORIGINS, ...envAllowed])];

console.log("CORS allowed origins:", ALLOWED_ORIGINS);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return cb(null, true);

      // allow exact matches from env / defaults
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);

      // optionally: allow any localhost:* in dev
      if (
        process.env.NODE_ENV !== "production" &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return cb(null, true);
      }

      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: false, // keep false if you use Bearer tokens (no cookies)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// answer preflight early
app.options("*", cors());

// optional: short-circuit OPTIONS (helps if any middleware below would block it)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

connectDB().then(async () => {
  if (process.env.NODE_ENV !== "production") {
    await ensureBootstrapAdmin();
    await ensureDefaultRoles();
  }
  console.log("✅ MongoDB connected and bootstrapped");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// simple log so you SEE whether GET is actually reaching the server
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} :: Origin=${req.headers.origin}`);
  next();
});

app.use("/api", routes);

app.use(errorHandler);

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

export default app;
