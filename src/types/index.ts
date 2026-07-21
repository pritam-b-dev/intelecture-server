// Shared Database Types for Intelecture Server

export type UserRole = "user" | "admin";
export type LearningLevel = "beginner" | "intermediate" | "advanced";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type LearningStatus = "not_started" | "learning" | "mastered";
export type RecommendationPriority = 1 | 2 | 3;

/* -------------------------------------------------------------------------- */
/*                                  User Type                                 */
/* -------------------------------------------------------------------------- */
export interface User {
  _id?: string;
  id?: string; // BetterAuth fields
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  learningLevel?: LearningLevel;
  createdAt: string; // 🌟 Changed from Date to string
}

/* -------------------------------------------------------------------------- */
/*                                 Topic Type                                 */
/* -------------------------------------------------------------------------- */
export interface Topic {
  _id: string;
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
  ownerId: string;
  ownerName: string;
  conceptCount: number;
  masteredCount: number;
  createdAt: string;
  updatedAt: string;
}
/* -------------------------------------------------------------------------- */
/*                                Concept Type                                */
/* -------------------------------------------------------------------------- */
export interface Concept {
  _id: string;
  topicId: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  status: LearningStatus;
  createdAt: string; // 🌟 Changed from Date to string
  updatedAt: string; // 🌟 Changed from Date to string
}

/* -------------------------------------------------------------------------- */
/*                                  Note Type                                 */
/* -------------------------------------------------------------------------- */
export interface Note {
  _id: string;
  conceptId: string;
  userId: string;
  title: string;
  content: string;
  status: LearningStatus;
  createdAt: string; // 🌟 Changed from Date to string
  updatedAt: string; // 🌟 Changed from Date to string
}

/* -------------------------------------------------------------------------- */
/*                             Recommendation Type                            */
/* -------------------------------------------------------------------------- */
export interface Recommendation {
  conceptId: string;
  conceptName: string;
  topicId: string;
  topicName: string;
  reason: string;
  priority: RecommendationPriority;
  difficulty: Difficulty;
  aiGenerated: boolean;
  generatedAt?: string; // 🌟 Changed from Date to string
}

/* -------------------------------------------------------------------------- */
/*                               Chat Message Type                            */
/* -------------------------------------------------------------------------- */
export interface ChatMessage {
  _id?: string;
  userId: string;
  conceptId: string;
  role: "user" | "assistant";
  message: string;
  timestamp: string; // 🌟 Changed from Date to string
}
