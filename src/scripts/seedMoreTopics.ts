import { topicsCollection, usersCollection } from "../lib/db.js";

const demoTopics = [
  {
    name: "React Fundamentals",
    description:
      "Component-based UI development with React, hooks, and state management.",
    category: "tech",
    imageUrl: "https://picsum.photos/seed/react/500/300",
  },
  {
    name: "Organic Chemistry",
    description:
      "Structure, properties, and reactions of carbon-based compounds.",
    category: "science",
    imageUrl: "https://picsum.photos/seed/chemistry/500/300",
  },
  {
    name: "Linear Algebra",
    description:
      "Vectors, matrices, and linear transformations for engineering and ML.",
    category: "math",
    imageUrl: "https://picsum.photos/seed/linalg/500/300",
  },
  {
    name: "Python for Data Science",
    description: "Numpy, Pandas, and data manipulation basics.",
    category: "tech",
    imageUrl: "https://picsum.photos/seed/python/500/300",
  },
  {
    name: "Cell Biology",
    description: "Structure and function of the cell, the basic unit of life.",
    category: "science",
    imageUrl: "https://picsum.photos/seed/biology/500/300",
  },
  {
    name: "Calculus I",
    description: "Limits, derivatives, and their applications.",
    category: "math",
    imageUrl: "https://picsum.photos/seed/calculus/500/300",
  },
];

async function seed() {
  const demoUser = await usersCollection.findOne({
    email: "demo@intelecture.com",
  });
  if (!demoUser) {
    console.error(
      "demo@intelecture.com not found — sign up with this email first.",
    );
    process.exit(1);
  }

  const docs = demoTopics.map((t) => ({
    ...t,
    ownerId: demoUser._id!.toString(),
    ownerName: demoUser.name,
    conceptCount: 0,
    masteredCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const result = await topicsCollection.insertMany(docs as any);
  console.log(`Inserted ${result.insertedCount} topics.`);
  process.exit(0);
}

seed();
