import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
// Importing with .js extensions is strictly required
import { client } from "./lib/db.js";
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
// Mount BetterAuth api routes at /api/auth/* using the Node native handler
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

app.get("/health", (req, res) => {
  res.status(200).send("Intelecture server running");
});

/* -------------------------------------------------------------------------- */
/*                               Start Listening                              */
/* -------------------------------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`[server]: Intelecture server running on port ${PORT}`);
});
