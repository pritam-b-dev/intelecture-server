import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { verifySession } from "../middleware/verifySession.js";
import { topicsCollection } from "../lib/db.js";
// 🌟 আপনার এক্সপোর্ট করা টাইপড টপিক কালেকশন ইম্পোর্ট করুন

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

// টপিক ডিলিট বা হ্যান্ডেল করার রাউট (Line 125, 132 এরর ফিক্সড)
router.delete("/:id", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    // 🌟 'as string' কাস্টিং এর মাধ্যমে ওভারলোড এরর সমাধান
    const id = req.params.id as string;
    const ownerId = authReq.user!.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Topic ID" });
    }

    // 🌟 সরাসরি টপিক কালেকশন থেকে ডিলিট
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

export default router;
