import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { topicsCollection } from "../lib/db.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    learningLevel?: "beginner" | "intermediate" | "advanced";
  };
}

const router = Router();

// 🌟 B5: GET /api/topics - সব টপিক লিস্ট ফেচ করার রাউট
router.get("/", verifySession, async (req: Request, res: Response) => {
  try {
    const { category, sort } = req.query;
    const query: any = {};

    if (category && category !== "all") {
      query.category = category as string;
    }

    let sortOption: any = { _id: -1 };
    if (sort === "popularity") {
      sortOption = { conceptCount: -1 };
    }

    const items = await topicsCollection.find(query).sort(sortOption).toArray();
    const total = await topicsCollection.countDocuments(query);

    res.json({ items, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🌟 ফিক্স: ইউজারের নিজস্ব টপিকগুলো নিয়ে আসার জন্য নতুন রাউট
router.get("/my", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user!.id;

    // শুধুমাত্র ওই ইউজারের টপিকগুলো ফেচ করা
    const items = await topicsCollection
      .find({ ownerId: userId })
      .sort({ _id: -1 })
      .toArray();

    res.json({ items, total: items.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔥 GET /api/topics/:id - নির্দিষ্ট একটা টপিক ডিটেইলস নিয়ে আসার রাউট (ফিক্সড)
router.get("/:id", verifySession, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // ১ ও ২ নম্বর এরর ফিক্স: নিশ্চিত হওয়া যে id একটি স্ট্রিং এবং ভ্যালিড ObjectId
    if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Topic ID" });
    }

    // ডাটাবেজ থেকে খোঁজা
    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });

    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // ৩ নম্বর এরর ফিক্স: টাইপ অবজেক্টকে এনি (any) তে কাস্ট করে কনসেপ্ট রিড করা
    const topicData = topic as any;

    res.json({
      id: topic._id.toString(),
      name: topicData.name,
      description: topicData.description,
      ownerId: topicData.ownerId,
      concepts: topicData.concepts || [], // এখন আর প্রপার্টি এরর দেবে না
      createdAt: topicData.createdAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑️ DELETE /api/topics/:id - টপিক ডিলিট করার রাউট (ফিক্সড)
router.delete("/:id", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const id = req.params.id;

    // নিশ্চিত হওয়া যে id একটি স্ট্রিং এবং ভ্যালিড ObjectId
    if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Topic ID" });
    }

    const ownerId = authReq.user!.id;

    const result = await topicsCollection.deleteOne({
      _id: new ObjectId(id),
      ownerId: ownerId,
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Topic not found or unauthorized" });
    }

    res.json({ success: true, message: "Topic deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const { name, description, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Topic name is required",
      });
    }

    const topic = {
      name: name.trim(),
      description: description ?? "",
      category: category ?? "General",

      ownerId: authReq.user!.id,
      ownerName: authReq.user!.name,

      conceptCount: 0,
      masteredCount: 0,

      concepts: [],

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await topicsCollection.insertOne(topic as any);

    res.status(201).json({
      ...topic,
      _id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

router.patch("/:id", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(String(id))) {
      return res.status(400).json({
        message: "Invalid Topic ID",
      });
    }

    const topic = await topicsCollection.findOne({
      _id: new ObjectId(String(id)),
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const topicData = topic as any;

    if (topicData.ownerId !== authReq.user!.id) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const updateData = {
      name: req.body.name?.trim(),
      description: req.body.description,
      category: req.body.category,
      updatedAt: new Date().toISOString(),
    };

    await topicsCollection.updateOne(
      {
        _id: new ObjectId(String(id)),
      },
      {
        $set: updateData,
      },
    );

    const updated = await topicsCollection.findOne({
      _id: new ObjectId(String(id)),
    });

    res.json(updated);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
