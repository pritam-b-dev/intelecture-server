import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { chatHistoryCollection, conceptsCollection } from "../lib/db.js";
import { anthropic } from "../lib/llm.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; name: string; email: string; role: "user" | "admin" };
}

const router = Router();

router.get(
  "/history/:conceptId",
  verifySession,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const items = await chatHistoryCollection
        .find({ conceptId: req.params.conceptId, userId: authReq.user!.id })
        .sort({ timestamp: 1 })
        .toArray();
      res.json(items);
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.post("/message", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { conceptId, message } = authReq.body;
    const userId = authReq.user!.id;

    await chatCollection.insertOne({
      userId,
      conceptId,
      role: "user",
      message,
      timestamp: new Date().toISOString(),
    } as any);

    const concept = await conceptsCollection.findOne({
      _id: new ObjectId(conceptId),
    });
    const history = await chatCollection
      .find({ conceptId, userId })
      .sort({ timestamp: 1 })
      .limit(10)
      .toArray();

    const completion = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 400,
      system: `You are a friendly, concise AI tutor helping a student understand "${concept?.name || "this concept"}". Description: ${concept?.description || ""}. Explain clearly with a short example.`,
      messages: history.map((h: any) => ({ role: h.role, content: h.message })),
    });

    const replyText =
      completion.content[0].type === "text"
        ? completion.content[0].text
        : "Sorry, I couldn't generate a response.";

    const assistantMessage = {
      userId,
      conceptId,
      role: "assistant",
      message: replyText,
      timestamp: new Date().toISOString(),
    };
    const result = await chatCollection.insertOne(assistantMessage as any);

    res.status(201).json({ ...assistantMessage, _id: result.insertedId });
  } catch (error) {
    console.error("[Chat Error]:", error);
    res.status(500).json({ success: false, message: "AI response failed" });
  }
});

export default router;
