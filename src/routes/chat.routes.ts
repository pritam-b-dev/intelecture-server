import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";

import { chatHistoryCollection, conceptsCollection } from "../lib/db.js";
import { verifySession } from "../middleware/verifySession.js"; // 👈 সঠিক ফাইলের পাথ আপডেট করা হলো

const router = Router();

// Anthropic Client Initialization
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 🌟 POST /api/chat/message (B7)
 * একটি সিঙ্গেল মেসেজ (user/assistant) ডাটাবেজে সেভ করা
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
 * নির্দিষ্ট কনসেপ্টের সর্বশেষ ২০টি মেসেজ ফেচ করা (ফ্ল্যাট লিস্ট)
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

    // নির্দিষ্ট কনসেপ্টের শেষ ২০টি মেসেজ আনো
    const docs = await chatHistoryCollection
      .find({ userId, conceptId: conceptId as string })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    // ক্রমানুসারে সাজিয়ে নেওয়া হলো (পুরনো থেকে নতুন)
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
 * Anthropic SSE Streaming Chat Endpoint
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

    // ১. কনসেপ্ট ডিটেইলস ফেচ করা
    const conceptQuery = ObjectId.isValid(conceptId)
      ? { _id: new ObjectId(conceptId) }
      : { _id: conceptId };

    const concept = await conceptsCollection.findOne(conceptQuery as any);
    const conceptName = concept?.name || "this concept";
    const conceptDescription =
      concept?.description || "No specific description available.";

    // ২. আগের কনভারসেশন হিস্ট্রি ফেচ করা (সর্বশেষ ১০টি মেসেজ)
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

    // ৩. বর্তমান ইউজার মেসেজ ডাটাবেজে সেভ করা
    const userMsgDoc = {
      userId,
      conceptId,
      role: "user" as const,
      message,
      timestamp: new Date().toISOString(),
    };
    await chatHistoryCollection.insertOne(userMsgDoc);

    formattedHistory.push({
      role: "user",
      content: message,
    });

    // ৪. সিস্টেম প্রম্পট তৈরি করা
    const systemPrompt = `You are a friendly and knowledgeable AI tutor helping a student learn about "${conceptName}". 
Context / Description: ${conceptDescription}. 
Explain concepts clearly, concisely, and keep your answers engaging.`;

    // 🌟 SSE (Server-Sent Events) হেডার সেটআপ
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // ৫. Anthropic-এর সাথে Streaming Call
    const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedHistory,
      stream: true,
    });

    let assistantFullResponse = "";

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const textChunk = chunk.delta.text;
        assistantFullResponse += textChunk;

        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

    // ৬. AI-এর সম্পূর্ণ রেসপন্স ডাটাবেজে সেভ করা
    if (assistantFullResponse) {
      await chatHistoryCollection.insertOne({
        userId,
        conceptId,
        role: "assistant" as const,
        message: assistantFullResponse,
        timestamp: new Date().toISOString(),
      });
    }
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

export default router;
