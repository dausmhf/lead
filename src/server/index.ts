import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { apiRouter } from "./routes/api";
import { registerAuthRoutes, requireAuth } from "./auth";

const app = express();
const port = Number(process.env.PORT ?? 8788);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://dashboard.dausmhf.com";

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Global rate limiter: 200 req / 60s per IP
app.use(rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." }
}));

app.use(express.json());

const authRouter = express.Router();

// Strict rate limiter for login: 10 req / 60s per IP
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts." }
});

registerAuthRoutes(authRouter);
authRouter.use("/auth/login", authLimiter);
app.use("/api", authRouter);
app.use("/api", requireAuth, apiRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: error.issues });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return res.status(500).json({ error: message });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Lead Website API running at http://127.0.0.1:${port}/api`);
});
