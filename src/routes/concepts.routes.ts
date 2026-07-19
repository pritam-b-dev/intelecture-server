import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Concept } from "../types/index.js";
import { verifySession } from "../middleware/verifySession.js";
import { conceptsCollection } from "../lib/db.js";
// 🌟 আপনার এক্সপোর্ট করা টাইপড কালেকশন ইম্পোর্ট করুন (পাথটি আপনার প্রজেক্ট অনুযায়ী চেক করে নেবেন)

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

// ১. কনসেপ্ট তৈরি করার রাউট (Line 61-62 ডেট এরর ফিক্সড)
router.post("/", verifySession, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { name, description, difficulty, topicId, status } = authReq.body;

    // 🌟 _id ছাড়া পিওর অবজেক্ট তৈরি করুন
    const newConcept: Omit<Concept, "_id"> = {
      topicId,
      name,
      description,
      difficulty,
      status: status || "not_started",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 🌟 কোনো এরর ছাড়াই পারফেক্টলি ইনসার্ট হবে!
    // কারণ টাইপস্ক্রিপ্ট এখন জানে যে ConceptDocument-এর _id ইনসার্টের সময় অপশনাল।
    const result = await conceptsCollection.insertOne(newConcept);
    res
      .status(201)
      .json({ success: true, id: result.insertedId, data: newConcept });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ২. আইডি দিয়ে কনসেপ্ট খোঁজা বা ফিল্টার করা (Line 108, 115, 160+ ওভারলোড এরর ফিক্সড)
router.get("/:id", verifySession, async (req: Request, res: Response) => {
  try {
    // 🌟 'as string' দিয়ে টাইপ কাস্ট করায় string[] এর ঝামেলা শেষ
    const conceptId = req.params.id as string;
    const topicId = req.query.topicId as string;

    if (!ObjectId.isValid(conceptId)) {
      return res.status(400).json({ message: "Invalid Concept ID format" });
    }

    // 🌟 টাইপড কালেকশনে ObjectId দিয়ে খোঁজা
    const concept = await conceptsCollection.findOne({
      _id: new ObjectId(conceptId),
    });

    if (!concept) {
      return res.status(404).json({ message: "Concept not found" });
    }

    res.json({ success: true, data: concept });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
