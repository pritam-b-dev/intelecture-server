import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth.js";

dotenv.config();

const app = express();

export const PORT = process.env.PORT || 5000;

/* -------------------------------------------------------------------------- */
/*                                Middlewares                                 */
/* -------------------------------------------------------------------------- */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

/* -------------------------------------------------------------------------- */
/*                            BetterAuth Mounting                             */
/* -------------------------------------------------------------------------- */
app.all("/api/auth/*any", toNodeHandler(auth));

/* -------------------------------------------------------------------------- */
/*                                Health Check                                */
/* -------------------------------------------------------------------------- */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Intelecture server running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`[server]: Intelecture server running on port ${PORT}`);
});
