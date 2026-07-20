import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../lib/auth.js";
import { chatHistoryCollection, conceptsCollection } from "../lib/db.js";

const router = Router();

// Anthropic Client Initialization
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 🌟 POST /api/chat/stream
 * Better Auth Session + Anthropic SSE Streaming Chat Endpoint
 */
router.post("/stream", async (req: Request, res: Response) => {
  try {
    // ১. Better Auth দিয়ে সেশন ভ্যালিডেশন
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ message: "Unauthorized: Invalid session" });
    }

    const userId = session.user.id;
    const { conceptId, message } = req.body;

    if (!conceptId || !message) {
      return res
        .status(400)
        .json({ message: "conceptId and message are required" });
    }

    // ২. কনসেপ্ট ডিটেইলস ফেচ করা (নাম ও ডেসক্রিপশন)
    const conceptQuery = ObjectId.isValid(conceptId)
      ? { _id: new ObjectId(conceptId) }
      : { _id: conceptId };

    const concept = await conceptsCollection.findOne(conceptQuery as any);
    const conceptName = concept?.name || "this concept";
    const conceptDescription =
      concept?.description || "No specific description available.";

    // ৩. আগের কনভারসেশন হিস্ট্রি ফেচ করা (সর্বশেষ ৫ জোড়া / ১০টি মেসেজ)
    const historyDocs = await chatHistoryCollection
      .find({ userId, conceptId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    // হিস্ট্রি ক্রমানুসারে সাজানো (Oldest to Newest)
    const history = historyDocs.reverse();

    // Anthropic-এর মেসেজ ফরম্যাটে রূপান্তর
    const formattedHistory: Anthropic.MessageParam[] = history.map((doc) => ({
      role: doc.role === "user" ? "user" : "assistant",
      content: doc.message,
    }));

    // ৪. বর্তমান ইউজার মেসেজ ডাটাবেজে সেভ করা
    const userMsgDoc = {
      userId,
      conceptId,
      role: "user" as const,
      message,
      timestamp: new Date().toISOString(),
    };
    await chatHistoryCollection.insertOne(userMsgDoc);

    // বর্তমান মেসেজটি Anthropic হিস্ট্রিতে যোগ করা
    formattedHistory.push({
      role: "user",
      content: message,
    });

    // ৫. সিস্টেম প্রম্পট তৈরি করা
    const systemPrompt = `You are a friendly and knowledgeable AI tutor helping a student learn about "${conceptName}". 
Context / Description: ${conceptDescription}. 
Explain concepts clearly, concisely, and keep your answers engaging.`;

    // 🌟 SSE (Server-Sent Events) হেডার সেটআপ
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // ৬. Anthropic-এর সাথে Streaming Call (Claude 3.5 Sonnet)
    const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedHistory,
      stream: true,
    });

    let assistantFullResponse = "";

    // চ্যাঙ্ক বাই চ্যাঙ্ক ক্লায়েন্টে পাঠানো
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const textChunk = chunk.delta.text;
        assistantFullResponse += textChunk;

        // ক্লায়েন্টে ডেটা পাঠানো
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }
    }

    // স্ট্রিম শেষ বোঝাতে [DONE] সিগন্যাল পাঠানো
    res.write("data: [DONE]\n\n");
    res.end();

    // ৭. AI-এর সম্পূর্ণ রেসপন্স ডাটাবেজে সেভ করা
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
