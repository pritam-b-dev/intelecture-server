import { ObjectId } from "mongodb";
import {
  client,
  usersCollection,
  topicsCollection,
  conceptsCollection,
  notesCollection,
} from "../lib/db.js";
import { recommendTopicsForUser } from "../agents/recommendationAgent.js";
import { TopicDocument, ConceptDocument, NoteDocument } from "../lib/db.js";

async function runSeed() {
  try {
    const TARGET_EMAIL = "demo@intelecture.com";

    // ১. ডাটাবেস থেকে ইউজার খোঁজা
    const user = await usersCollection.findOne({ email: TARGET_EMAIL });

    // ২. ইউজার না পেলে এরর দিয়ে এক্সিট করা
    if (!user) {
      console.error(
        "❌ User not found — please sign up through the app first, then re-run this script.",
      );
      process.exit(1);
    }

    // BetterAuth-এর id অথবা MongoDB-এর _id ব্যবহার করা
    const userId = user.id || user._id!.toString();
    const userName = user.name || "Demo User";
    const now = new Date().toISOString();

    console.log(
      `[Seed] Found user: ${TARGET_EMAIL} (ID: ${userId}). Cleaning old data...`,
    );

    // (ঐচ্ছিক) ডুপ্লিকেট এড়াতে এই ইউজারের আগের সিড ডাটা মুছে ফেলা
    const oldTopics = await topicsCollection
      .find({ ownerId: userId })
      .toArray();
    const oldTopicIds = oldTopics.map((t) => t._id!.toString());

    if (oldTopicIds.length > 0) {
      await conceptsCollection.deleteMany({
        topicId: { $in: oldTopicIds },
      } as any);
      await topicsCollection.deleteMany({ ownerId: userId });
      await notesCollection.deleteMany({ userId: userId });
    }

    const topicsData: TopicDocument[] = [
      {
        name: "Physics",
        description: "Understanding the universe from quarks to galaxies.",
        category: "Science",
        image:
          "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 3,
        masteredCount: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Web Development",
        description: "Building modern web applications.",
        category: "Technology",
        image:
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 3,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Mathematics",
        description: "The language of numbers, shapes, and logic.",
        category: "Math",
        image:
          "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 3,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Artificial Intelligence",
        description: "Machine learning, neural networks and modern AI.",
        category: "Technology",
        image:
          "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 0,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Cyber Security",
        description: "Protecting systems and networks from attacks.",
        category: "Technology",
        image:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 0,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Data Science",
        description: "Analyze data to discover useful insights.",
        category: "Technology",
        image:
          "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 0,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Chemistry",
        description: "Study of atoms, molecules and chemical reactions.",
        category: "Science",
        image:
          "https://images.unsplash.com/photo-1532634993-15f421e42ec0?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 0,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Biology",
        description: "Explore living organisms and ecosystems.",
        category: "Science",
        image:
          "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 0,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "UI/UX Design",
        description: "Create intuitive and beautiful digital experiences.",
        category: "Design",
        image:
          "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200",
        ownerId: userId,
        ownerName: userName,
        conceptCount: 0,
        masteredCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const topicInsertResult = await topicsCollection.insertMany(topicsData);
    const physicsId = topicInsertResult.insertedIds[0].toString();
    const webDevId = topicInsertResult.insertedIds[1].toString();
    const mathId = topicInsertResult.insertedIds[2].toString();

    // ৪. ৯টি কনসেপ্ট তৈরি
    const conceptsData: ConceptDocument[] = [
      // Physics Concepts
      {
        topicId: physicsId,
        name: "Newton's Laws",
        description: "The three laws of motion.",
        difficulty: 2,
        status: "mastered",
        createdAt: now,
        updatedAt: now,
      },
      {
        topicId: physicsId,
        name: "Thermodynamics",
        description: "Heat, work, and temperature.",
        difficulty: 4,
        status: "learning",
        createdAt: now,
        updatedAt: now,
      },
      {
        topicId: physicsId,
        name: "Quantum Mechanics",
        description: "Behavior of matter and light on atomic scales.",
        difficulty: 5,
        status: "not_started",
        createdAt: now,
        updatedAt: now,
      },

      // Web Dev Concepts
      {
        topicId: webDevId,
        name: "HTML Basics",
        description: "Hypertext Markup Language structure.",
        difficulty: 1,
        status: "mastered",
        createdAt: now,
        updatedAt: now,
      },
      {
        topicId: webDevId,
        name: "React Fundamentals",
        description: "Components, state, and props.",
        difficulty: 3,
        status: "learning",
        createdAt: now,
        updatedAt: now,
      },
      {
        topicId: webDevId,
        name: "Node.js API",
        description: "Building REST APIs with Express.",
        difficulty: 4,
        status: "not_started",
        createdAt: now,
        updatedAt: now,
      },

      // Mathematics Concepts
      {
        topicId: mathId,
        name: "Linear Algebra",
        description: "Vectors, matrices, and linear transforms.",
        difficulty: 3,
        status: "not_started",
        createdAt: now,
        updatedAt: now,
      },
      {
        topicId: mathId,
        name: "Calculus",
        description: "Derivatives and integrals.",
        difficulty: 4,
        status: "learning",
        createdAt: now,
        updatedAt: now,
      },
      {
        topicId: mathId,
        name: "Probability",
        description: "Measure of the likelihood of an event.",
        difficulty: 3,
        status: "not_started",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const conceptInsertResult =
      await conceptsCollection.insertMany(conceptsData);
    const conceptIds = Object.values(conceptInsertResult.insertedIds).map(
      (id) => id.toString(),
    );

    // ৫. ৬টি নোটস তৈরি (Recommendation Agent-এর জন্য status "mastered" খুব গুরুত্বপূর্ণ)
    const notesData: NoteDocument[] = [
      {
        conceptId: conceptIds[0],
        userId: userId,
        title: "Newton's Laws Summary",
        content: "F = ma, action and reaction.",
        status: "mastered",
        createdAt: now,
        updatedAt: now,
      },
      {
        conceptId: conceptIds[1],
        userId: userId,
        title: "Laws of Thermodynamics",
        content: "Energy cannot be created or destroyed.",
        status: "learning",
        createdAt: now,
        updatedAt: now,
      },
      {
        conceptId: conceptIds[3],
        userId: userId,
        title: "HTML Tags",
        content: "div, span, p, h1-h6.",
        status: "mastered",
        createdAt: now,
        updatedAt: now,
      },
      {
        conceptId: conceptIds[4],
        userId: userId,
        title: "React State Management",
        content: "useState and useEffect hooks overview.",
        status: "learning",
        createdAt: now,
        updatedAt: now,
      },
      {
        conceptId: conceptIds[7],
        userId: userId,
        title: "Basic Integrals",
        content: "Reverse of differentiation.",
        status: "learning",
        createdAt: now,
        updatedAt: now,
      },
      {
        conceptId: conceptIds[8],
        userId: userId,
        title: "Bayes Theorem",
        content: "Conditional probability formula.",
        status: "not_started",
        createdAt: now,
        updatedAt: now,
      },
    ];

    await notesCollection.insertMany(notesData);

    // ৬. রেকমেন্ডেশন জেনারেট করা (আপনার recommendationAgent থেকে)
    const recommendations = await recommendTopicsForUser(userId);

    // ফাইনাল লগ
    console.log(
      `✅ Seeded 3 topics, 9 concepts, 6 notes, ${recommendations.length} recommendations for ${TARGET_EMAIL}.`,
    );
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await client.close();
    console.log("[database]: Connection closed.");
    process.exit(0); // নিশ্চিত করে প্রসেস থামানোর জন্য
  }
}

runSeed();
