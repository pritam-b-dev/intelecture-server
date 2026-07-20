import { Router, Request, Response } from "express";
import { verifySession } from "../middleware/verifySession.js";
import { conceptsCollection, topicsCollection } from "../lib/db.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; name: string; email: string; role: "user" | "admin" };
}

const router = Router();

router.get("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const myTopics = await topicsCollection
      .find({ ownerId: authReq.user!.id })
      .toArray();
    const topicMap = new Map(
      myTopics.map((t: any) => [t._id.toString(), t.name]),
    );
    const topicIds = myTopics.map((t: any) => t._id.toString());

    const candidates = await conceptsCollection
      .find({ topicId: { $in: topicIds }, status: { $ne: "mastered" } })
      .sort({ difficulty: 1 })
      .limit(5)
      .toArray();

    const items = candidates.map((c: any, index: number) => ({
      conceptId: c._id.toString(),
      conceptName: c.name,
      topicId: c.topicId,
      topicName: topicMap.get(c.topicId) || "Unknown Topic",
      reason:
        c.status === "learning"
          ? "You're already learning this — keep going!"
          : "Good next step based on difficulty level",
      priority: index === 0 ? 1 : index < 3 ? 2 : 3,
      difficulty: c.difficulty,
      aiGenerated: true,
      generatedAt: new Date().toISOString(),
    }));

    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
