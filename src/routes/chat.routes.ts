import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";

import { chatHistoryCollection, conceptsCollection } from "../lib/db.js";
import { verifySession } from "../middleware/verifySession.js";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 🌟 POST /api/chat/message (B7)
 */
router.post("/message", verifySession, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { conceptId, message, role = "user" } = req.body;

    if (!conceptId || !message) {
      return res
        .status(400)
        .json({ message: "conceptId and message are required" });
    }

    const newMessage = {
      userId,
      conceptId,
      role: role as "user" | "assistant",
      message,
      timestamp: new Date().toISOString(),
    };

    const result = await chatHistoryCollection.insertOne(newMessage);

    return res.status(201).json({
      _id: result.insertedId,
      ...newMessage,
    });
  } catch (error) {
    console.error("❌ Error in POST /api/chat/message:", error);
    return res.status(500).json({ message: "Failed to store chat message" });
  }
});

/**
 * 🌟 GET /api/chat/history?conceptId=X (B7)
 */
router.get("/history", verifySession, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { conceptId } = req.query;

    if (!conceptId) {
      return res
        .status(400)
        .json({ message: "conceptId query parameter is required" });
    }

    const docs = await chatHistoryCollection
      .find({ userId, conceptId: conceptId as string })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    const history = docs.reverse().map((doc) => ({
      _id: doc._id,
      userId: doc.userId,
      conceptId: doc.conceptId,
      role: doc.role,
      message: doc.message,
      timestamp: doc.timestamp,
    }));

    return res.json(history);
  } catch (error) {
    console.error("❌ Error in GET /api/chat/history:", error);
    return res.status(500).json({ message: "Failed to fetch chat history" });
  }
});

/**
 * 🌟 POST /api/chat/stream (B9)
 */
router.post("/stream", verifySession, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { conceptId, message } = req.body;

    if (!conceptId || !message) {
      return res
        .status(400)
        .json({ message: "conceptId and message are required" });
    }

    const conceptQuery = ObjectId.isValid(conceptId)
      ? { _id: new ObjectId(conceptId) }
      : { _id: conceptId };

    const concept = await conceptsCollection.findOne(conceptQuery as any);
    const conceptName = concept?.name || "this concept";
    const conceptDescription =
      concept?.description || "No specific description available.";

    const historyDocs = await chatHistoryCollection
      .find({ userId, conceptId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    const history = historyDocs.reverse();

    const formattedHistory: Anthropic.MessageParam[] = history.map((doc) => ({
      role: doc.role === "user" ? "user" : "assistant",
      content: doc.message,
    }));

    // বর্তমান ইউজার মেসেজ ডাটাবেজে সেভ
    await chatHistoryCollection.insertOne({
      userId,
      conceptId,
      role: "user",
      message,
      timestamp: new Date().toISOString(),
    });

    formattedHistory.push({
      role: "user",
      content: message,
    });

    const systemPrompt = `You are a friendly and knowledgeable AI tutor helping a student learn about "${conceptName}". 
Context / Description: ${conceptDescription}. 
Explain concepts clearly, concisely, and keep your answers engaging.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedHistory,
      stream: true,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("❌ Error in /api/chat/stream:", error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
      return res.end();
    }

    return res
      .status(500)
      .json({ message: "Failed to generate chat response" });
  }
});

/**
 * 🌟 POST /api/chat/save-response (B10)
 * AI-এর সম্পূর্ণ রেসপন্স ডাটাবেজে সেভ করা
 */
router.post(
  "/save-response",
  verifySession,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { conceptId, assistantMessage } = req.body;

      if (!conceptId || !assistantMessage) {
        return res
          .status(400)
          .json({ message: "conceptId and assistantMessage are required" });
      }

      const newHistoryItem = {
        userId,
        conceptId,
        role: "assistant" as const,
        message: assistantMessage,
        timestamp: new Date().toISOString(),
      };

      const result = await chatHistoryCollection.insertOne(newHistoryItem);

      return res.status(201).json({
        _id: result.insertedId,
        ...newHistoryItem,
      });
    } catch (error) {
      console.error("❌ Error in POST /api/chat/save-response:", error);
      return res
        .status(500)
        .json({ message: "Failed to save assistant response" });
    }
  },
);

export default router;
