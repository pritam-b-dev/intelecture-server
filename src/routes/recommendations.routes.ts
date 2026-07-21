import { Router, Request, Response } from "express";
import { verifySession } from "../middleware/verifySession.js";
import { conceptsCollection, topicsCollection } from "../lib/db.js";
import { groq } from "../lib/llm.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
  };
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
      .find({
        topicId: { $in: topicIds },
        status: { $ne: "mastered" },
      })
      .sort({ difficulty: 1 })
      .limit(5)
      .toArray();

    // Fallback recommendation
    const fallbackItems = candidates.map((c: any, index: number) => ({
      conceptId: c._id.toString(),
      conceptName: c.name,
      topicId: c.topicId,
      topicName: topicMap.get(c.topicId) || "Unknown Topic",
      reason:
        c.status === "learning"
          ? "You're already learning this — keep going!"
          : "Recommended based on your learning progress.",
      priority: index + 1,
      difficulty: c.difficulty,
      aiGenerated: false,
      generatedAt: new Date().toISOString(),
    }));

    // যদি কোন concept না থাকে
    if (candidates.length === 0) {
      return res.json({
        items: [],
        total: 0,
      });
    }

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `
You are an AI learning recommendation assistant.

Return ONLY valid JSON.

Example:

[
  {
    "conceptId":"123",
    "conceptName":"React",
    "topicId":"456",
    "topicName":"Web Development",
    "reason":"Learning React next is beneficial because you already know HTML.",
    "priority":1,
    "difficulty":3,
    "aiGenerated":true
  }
]
`,
          },
          {
            role: "user",
            content: `
Topics:
${JSON.stringify(myTopics)}

Candidate Concepts:
${JSON.stringify(candidates)}

Recommend up to 5 concepts.
Return JSON only.
`,
          },
        ],
      });

      const raw = completion?.choices?.[0]?.message?.content?.trim() || "[]";

      // JSON extract
      const match = raw.match(/\[[\s\S]*\]/);

      if (!match) {
        return res.json({
          items: fallbackItems,
          total: fallbackItems.length,
        });
      }

      const items = JSON.parse(match[0]);

      res.json({
        items,
        total: items.length,
      });
    } catch (aiError) {
      console.error("AI Recommendation Error:", aiError);

      res.json({
        items: fallbackItems,
        total: fallbackItems.length,
      });
    }
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
