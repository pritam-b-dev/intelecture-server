import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { notesCollection } from "../lib/db.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; name: string; email: string; role: "user" | "admin" };
}

const router = Router();

router.get("/", verifySession, async (req: Request, res: Response) => {
  try {
    const conceptId = req.query.conceptId as string;
    if (!conceptId)
      return res.status(400).json({ message: "conceptId is required" });
    const items = await notesCollection
      .find({ conceptId })
      .sort({ _id: -1 })
      .toArray();
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user!.id;
    const { conceptId, title, content } = authReq.body;
    const newNote = {
      conceptId,
      userId,
      title,
      content,
      status: "learning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await notesCollection.insertOne(newNote as any);
    res.status(201).json({ ...newNote, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:id", verifySession, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid Note ID" });
    const { title, content, status } = req.body;
    await notesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...(title && { title }),
          ...(content && { content }),
          ...(status && { status }),
          updatedAt: new Date().toISOString(),
        },
      },
    );
    const updated = await notesCollection.findOne({ _id: new ObjectId(id) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid Note ID" });
    const result = await notesCollection.deleteOne({
      _id: new ObjectId(id),
      userId: authReq.user!.id,
    });
    if (result.deletedCount === 0)
      return res
        .status(404)
        .json({ message: "Note not found or unauthorized" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
