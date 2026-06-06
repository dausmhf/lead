import "dotenv/config";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { apiRouter } from "./routes/api";
import { registerAuthRoutes, requireAuth } from "./auth";

const app = express();
const port = Number(process.env.PORT ?? 8788);

app.use(cors());
app.use(express.json());
const authRouter = express.Router();
registerAuthRoutes(authRouter);
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
