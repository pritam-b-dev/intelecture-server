import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { notesCollection } from "../lib/db.js";
// 🌟 আপনার এক্সপোর্ট করা টাইপড নোট কালেকশন ইম্পোর্ট করুন

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

// নোট তৈরি বা হ্যান্ডেল করার রাউট (Line 68 'possibly undefined' এরর ফিক্সড)
router.post("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    // 🌟 '!' ব্যবহার করায় টাইপস্ক্রিপ্ট নিশ্চিত যে user অবজেক্টটি আছে
    const userId = authReq.user!.id;
    const { conceptId, title, content, status } = authReq.body;

    const newNote = {
      conceptId,
      userId,
      title,
      content,
      status: status || "learning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 🌟 সরাসরি নোট কালেকশনে ইনসার্ট
    const result = await notesCollection.insertOne(newNote as any);

    res
      .status(201)
      .json({ success: true, id: result.insertedId, data: newNote });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
