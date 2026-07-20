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

/**
 * 🌟 GET /api/notes
 * ইউজারের সব নোট অথবা নির্দিষ্ট conceptId-এর নোটস ফেচ করার রাউট
 */
router.get("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const userId = authReq.user!.id;
    const { conceptId } = req.query;

    // ফিল্টার অবজেক্ট তৈরি
    const filter: Record<string, any> = { userId };

    // যদি কুয়েরিতে conceptId থাকে (যেমন: /api/notes?conceptId=xxx)
    if (conceptId) {
      filter.conceptId = conceptId as string;
    }

    const notes = await notesCollection.find(filter).toArray();

    res.json({
      items: notes,
      total: notes.length,
    });
  } catch (error) {
    console.error("[GET /api/notes error]:", error);
    res.status(500).json({ message: "Server error while fetching notes" });
  }
});

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

// ৩. আইডি দিয়ে নির্দিষ্ট নোট খোঁজার রাউট (প্রি-ফিলের জন্য লাগবে)
router.get("/:id", verifySession, async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id as string;

    if (!ObjectId.isValid(noteId)) {
      return res.status(400).json({ message: "Invalid Note ID format" });
    }

    const note = await notesCollection.findOne({
      _id: new ObjectId(noteId),
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ৪. নোট আপডেট করার রাউট (PUT Method)
router.put("/:id", verifySession, async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id as string;

    if (!ObjectId.isValid(noteId)) {
      return res.status(400).json({ message: "Invalid Note ID format" });
    }

    const { title, content, status } = req.body;

    // ডাইনামিকালি আপডেট অবজেক্ট তৈরি
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date().toISOString();

    const result = await notesCollection.findOneAndUpdate(
      { _id: new ObjectId(noteId) },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
