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

// 🌟 B5: GET /api/topics - টপিক লিস্ট ফেচ করার রাউট (নতুন যুক্ত হলো)
router.get("/", verifySession, async (req: Request, res: Response) => {
  try {
    // ফ্রন্টএন্ড থেকে আসা কুয়েরি প্যারামিটারগুলো নেওয়া হচ্ছে
    const { category, sort } = req.query;

    // ১. ক্যাটাগরি অনুযায়ী ফিল্টার কুয়েরি তৈরি
    const query: any = {};
    if (category && category !== "all") {
      query.category = category; // আপনার ডাটাবেজের ফিল্ড নেম অনুযায়ী মিলিয়ে নেবেন
    }

    // ২. সোর্টিং (Sort) লজিক তৈরি
    let sortOption: any = { _id: -1 }; // ডিফল্ট: Newest (নতুনগুলো আগে)

    if (sort === "popularity") {
      // পপুলারিটি সোর্ট: আমরা ধরে নিচ্ছি যে টপিকে conceptCount বেশি, সেটা বেশি পপুলার
      sortOption = { conceptCount: -1 };
    } else if (sort === "newest") {
      sortOption = { _id: -1 };
    }

    // ৩. ডাটাবেজ থেকে ডেটা খোঁজা এবং টোটাল কাউন্ট বের করা
    const items = await topicsCollection.find(query).sort(sortOption).toArray();
    const total = await topicsCollection.countDocuments(query);

    // ৪. ফ্রন্টএন্ডের কাঙ্ক্ষিত অবজেক্ট স্ট্রাকচারে রেসপন্স পাঠানো
    res.json({ items, total });
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// টপিক ডিলিট বা হ্যান্ডেল করার রাউট (আপনার বিদ্যমান কোড)
router.delete("/:id", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const id = req.params.id as string;
    const ownerId = authReq.user!.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Topic ID" });
    }

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
