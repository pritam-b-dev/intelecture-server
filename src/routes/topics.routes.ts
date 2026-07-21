import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { topicsCollection } from "../lib/db.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; name: string; email: string; role: "user" | "admin" };
}

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, sort, search, page, perPage } = req.query;
    const query: any = {};

    if (category && category !== "all") {
      query.category = { $regex: `^${category}$`, $options: "i" };
    }
    if (search) {
      query.name = { $regex: search as string, $options: "i" };
    }

    let sortOption: any = { _id: -1 };
    if (sort === "popularity") sortOption = { conceptCount: -1 };

    const pageNum = Number(page) || 1;
    const perPageNum = Number(perPage) || 8;
    const skip = (pageNum - 1) * perPageNum;

    const total = await topicsCollection.countDocuments(query);
    const items = await topicsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(perPageNum)
      .toArray();

    res.json({ items, total, page: pageNum, perPage: perPageNum });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/my", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const items = await topicsCollection
      .find({ ownerId: authReq.user!.id })
      .sort({ _id: -1 })
      .toArray();
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid Topic ID" });
    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { name, description, category, imageUrl } = authReq.body;
    const newTopic = {
      name,
      description,
      category,
      imageUrl: imageUrl || "",
      ownerId: authReq.user!.id,
      ownerName: authReq.user!.name,
      conceptCount: 0,
      masteredCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await topicsCollection.insertOne(newTopic as any);
    res.status(201).json({ ...newTopic, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid Topic ID" });
    const result = await topicsCollection.deleteOne({
      _id: new ObjectId(id),
      ownerId: authReq.user!.id,
    });
    if (result.deletedCount === 0)
      return res
        .status(404)
        .json({ message: "Topic not found or unauthorized" });
    res.json({ success: true, message: "Topic deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
