import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// Importing with .js extension is required for module: NodeNext
import { client } from "./lib/db.js";

dotenv.config();

const app = express();

// Export PORT as a constant per guidelines
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
/*                                Health Check                                */
/* -------------------------------------------------------------------------- */
// B2 Strict JSON Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Intelecture server running",
  });
});

// Optional: Retaining the B1 plain text health check if client needs a fallback
app.get("/health", (req, res) => {
  res.status(200).send("Intelecture server running");
});

/* -------------------------------------------------------------------------- */
/*                               Start Listening                              */
/* -------------------------------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`[server]: Intelecture server running on port ${PORT}`);
});
