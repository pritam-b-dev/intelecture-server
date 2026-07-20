import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { recommendationsCollection } from "../lib/db.js";
import { recommendTopicsForUser } from "../agents/recommendationAgent.js";
import { Recommendation } from "../types/index.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    learningLevel?: "beginner" | "intermediate" | "advanced";
  };
}

interface RecommendationDocument extends Recommendation {
  userId: string;
  _id?: ObjectId;
}

const router = Router();

/**
 * 🌟 B8: GET /api/recommendations
 * Fetch recommendations for user (B6 Logic Agent)
 * Return structure: [{conceptId, conceptName, topicId, topicName, reason, priority, difficulty, aiGenerated}]
 */
router.get("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user!.id;
    const { refresh } = req.query;

    // ১. ফোর্স রিফ্রেশ (?refresh=true) না থাকলে ক্যাশ (recommendationsCollection) থেকে রিড
    if (refresh !== "true") {
      const cachedRecs = (await recommendationsCollection
        .find({ userId } as any)
        .toArray()) as unknown as RecommendationDocument[];

      if (cachedRecs.length > 0) {
        const recommendations: Recommendation[] = cachedRecs.map(
          ({ userId: _, _id: __, ...rec }) => rec,
        );

        return res.json(recommendations);
      }
    }

    // ২. B6 logic agent থেকে রেকমেন্ডেশন জেনারেট করা (এখনকার জন্য pure logic)
    // 💡 B12-তে গিয়ে এখানে LLM দিয়ে 'reason' পাঠটি এনরিচ করা হবে
    const recommendations = await recommendTopicsForUser(userId);

    // প্রম্পট অনুযায়ী সরাসরি Recommendations-এর Array রিটার্ন করা হচ্ছে
    res.json(recommendations);
  } catch (error) {
    console.error("[GET /api/recommendations error]:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching recommendations" });
  }
});

export default router;
