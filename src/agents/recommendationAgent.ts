import { ObjectId } from "mongodb";
import {
  notesCollection,
  topicsCollection,
  conceptsCollection,
  recommendationsCollection,
} from "../lib/db.js";
import { Recommendation, RecommendationPriority } from "../types/index.js";

/**
 * B6 — Recommendation Agent (Backend Logic)
 * ইউজারের লার্নিং হিস্টোরি ও প্রিরেকুইজিট অ্যানালাইসিস করে টপ ৫টি কনসেপ্ট রেকমেন্ড করে।
 *
 * @param userId BetterAuth বা সেশন থেকে প্রাপ্ত ইউজারের ইউনিক আইডি
 */
export async function recommendTopicsForUser(
  userId: string,
): Promise<Recommendation[]> {
  try {
    // ১. ইউজারের মাস্টার্ড (Completed) কনসেপ্টগুলো নোটস কালেকশন থেকে ফেচ করা
    const masteredNotes = await notesCollection
      .find({ userId, status: "mastered" })
      .toArray();

    // দ্রুত খোঁজার সুবিধার্থে মাস্টার্ড কনসেপ্ট আইডিগুলোর একটি Set তৈরি
    const masteredConceptIds = new Set<string>(
      masteredNotes.map((note) => note.conceptId),
    );

    // ২. ইউজারের লার্নিং টপিকগুলো ফেচ করা (যেখানে ownerId === userId)
    const userTopics = await topicsCollection
      .find({ ownerId: userId })
      .toArray();

    if (userTopics.length === 0) {
      return []; // ইউজার যদি কোনো টপিক শুরু না করে থাকেন, তবে খালি অ্যারে রিটার্ন করবে
    }

    // টপিক আইডিগুলোর অ্যারে এবং নামের ম্যাপ তৈরি (পরবর্তীতে ওয়ান-পাস লুকে নাম পাওয়ার জন্য)
    const topicIds = userTopics.map((topic) => topic._id.toString());
    const topicNameMap = new Map<string, string>(
      userTopics.map((t) => [t._id.toString(), t.name]),
    );

    // ৩. ঐ সকল টপিকের অধীনে থাকা সমস্ত কনসেপ্ট ফেচ করা
    const allConcepts = await conceptsCollection
      .find({ topicId: { $in: topicIds } })
      .toArray();

    const recommendations: Recommendation[] = [];

    // ৪. কনসেপ্টগুলোর প্রিরেকুইজিট স্যাটিসফেকশন লজিক অ্যানালাইসিস
    for (const concept of allConcepts) {
      const conceptIdStr = concept._id.toString();

      // ইউজার অলরেডি এই কনসেপ্টটি মাস্টার করে ফেললে সেটিকে রেকমেন্ডেশন ক্যান্ডিডেট থেকে বাদ দিন
      if (masteredConceptIds.has(conceptIdStr)) {
        continue;
      }

      // ডাটাবেজের ডাইনামিক ফিল্ড থেকে 'prerequisites' অ্যারে নেওয়া (ডিফল্ট খালি অ্যারে)
      const prerequisites: string[] = (concept as any).prerequisites || [];

      let priority: RecommendationPriority = 3;
      let reason = "";

      if (prerequisites.length === 0) {
        // কোনো প্রিরেকুইজিট না থাকলে সরাসরি শেখা শুরু করা সম্ভব -> Priority 1
        priority = 1;
        reason = `Start learning "${concept.name}" to build foundational skills in ${topicNameMap.get(concept.topicId) || "this topic"}.`;
      } else {
        // মাস্টার্ড করা প্রিরেকুইজিটের সংখ্যা গণনা
        const masteredPrereqsCount = prerequisites.filter((id) =>
          masteredConceptIds.has(id),
        ).length;

        const satisfactionRate =
          (masteredPrereqsCount / prerequisites.length) * 100;

        if (masteredPrereqsCount === prerequisites.length) {
          // ১০০% প্রিরেকুইজিট কমপ্লিট -> Priority 1 (High)
          priority = 1;
          reason = `You have mastered all prerequisites for "${concept.name}". You are fully prepared to start this concept!`;
        } else if (satisfactionRate >= 80) {
          // ৮০% বা তার বেশি কমপ্লিট -> Priority 2
          priority = 2;
          reason = `You have completed ${Math.round(satisfactionRate)}% of the foundational topics for "${concept.name}". Highly recommended next step.`;
        } else {
          // ৮০% এর কম কমপ্লিট -> Priority 3 (Defer)
          priority = 3;
          reason = `We recommend reviewing more foundational concepts before diving deep into "${concept.name}".`;
        }
      }

      recommendations.push({
        conceptId: conceptIdStr,
        conceptName: concept.name,
        topicId: concept.topicId,
        topicName: topicNameMap.get(concept.topicId) || "Unknown Topic",
        reason,
        priority,
        difficulty: concept.difficulty,
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
      });
    }

    // ৫. প্রাইওরিটি অনুযায়ী আরোহী ক্রমে সাজানো (Priority 1 আগে আসবে) এবং শীর্ষ ৫টি নেওয়া
    recommendations.sort((a, b) => a.priority - b.priority);
    const topRecommendations = recommendations.slice(0, 5);

    // 🌟 ক্যাশিং লজিক: ড্যাশবোর্ডের স্পিড বাড়াতে recommendationsCollection-এ সেভ করা
    if (topRecommendations.length > 0) {
      // এই ইউজারের পুরনো ক্যাশড ডাটা ক্লিন করা
      await recommendationsCollection.deleteMany({ userId: userId } as any);

      // ডাটাবেজে ট্র্যাক করার জন্য userId যুক্ত করে ইনসার্ট করা
      const cachedDocuments = topRecommendations.map((rec) => ({
        ...rec,
        userId,
      }));
      await recommendationsCollection.insertMany(cachedDocuments as any);
    }

    return topRecommendations;
  } catch (error) {
    console.error(`[recommendationAgent error for user ${userId}]:`, error);
    throw error;
  }
}
