import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth.js";

import topicRouter from "./routes/topics.routes.js";
import conceptRouter from "./routes/concepts.routes.js";
import noteRouter from "./routes/notes.routes.js";
import recommendationRouter from "./routes/recommendations.routes.js";
import chatRouter from "./routes/chat.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.all("/api/auth/*any", toNodeHandler(auth));

app.use("/api/topics", topicRouter);
app.use("/api/concepts", conceptRouter);
app.use("/api/notes", noteRouter);
app.use("/api/recommendations", recommendationRouter);
app.use("/api/chat", chatRouter);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Intelecture server running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

export default app;
