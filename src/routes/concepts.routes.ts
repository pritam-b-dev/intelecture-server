import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Concept } from "../types/index.js";
import { verifySession } from "../middleware/verifySession.js";
import { conceptsCollection, topicsCollection } from "../lib/db.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; name: string; email: string; role: "user" | "admin" };
}

const router = Router();

router.get("/", verifySession, async (req: Request, res: Response) => {
  try {
    const topicId = req.query.topicId as string;
    if (!topicId)
      return res.status(400).json({ message: "topicId is required" });
    const items = await conceptsCollection
      .find({ topicId })
      .sort({ _id: 1 })
      .toArray();
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { name, description, difficulty, topicId } = authReq.body;
    const newConcept: Omit<Concept, "_id"> = {
      topicId,
      name,
      description,
      difficulty,
      status: "not_started",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await conceptsCollection.insertOne(newConcept as any);
    await topicsCollection.updateOne(
      { _id: new ObjectId(topicId) },
      { $inc: { conceptCount: 1 } },
    );
    res.status(201).json({ ...newConcept, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/:id", verifySession, async (req: Request, res: Response) => {
  try {
    const conceptId = req.params.id as string;
    if (!ObjectId.isValid(conceptId))
      return res.status(400).json({ message: "Invalid Concept ID" });
    const concept = await conceptsCollection.findOne({
      _id: new ObjectId(conceptId),
    });
    if (!concept) return res.status(404).json({ message: "Concept not found" });
    res.json(concept);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch(
  "/:id/status",
  verifySession,
  async (req: Request, res: Response) => {
    try {
      const conceptId = req.params.id as string;
      const { status } = req.body;
      if (!ObjectId.isValid(conceptId))
        return res.status(400).json({ message: "Invalid Concept ID" });

      const concept = await conceptsCollection.findOne({
        _id: new ObjectId(conceptId),
      });
      if (!concept)
        return res.status(404).json({ message: "Concept not found" });

      await conceptsCollection.updateOne(
        { _id: new ObjectId(conceptId) },
        { $set: { status, updatedAt: new Date().toISOString() } },
      );

      if (status === "mastered" && concept.status !== "mastered") {
        await topicsCollection.updateOne(
          { _id: new ObjectId(concept.topicId) },
          { $inc: { masteredCount: 1 } },
        );
      } else if (status !== "mastered" && concept.status === "mastered") {
        await topicsCollection.updateOne(
          { _id: new ObjectId(concept.topicId) },
          { $inc: { masteredCount: -1 } },
        );
      }

      const updated = await conceptsCollection.findOne({
        _id: new ObjectId(conceptId),
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

export default router;
