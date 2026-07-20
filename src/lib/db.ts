import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import dotenv from "dotenv";
import {
  User,
  Topic,
  Concept,
  Note,
  Recommendation,
  ChatMessage,
} from "../types/index.js";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env",
  );
}

const client = new MongoClient(uri);

// Establish connection immediately using top-level await
await client.connect();

// Database initialization
export const db: Db = client.db("intelecture_db");
console.log("[database]: Connected successfully to MongoDB (intelecture_db)");

/* -------------------------------------------------------------------------- */
/*                        Database Document Interfaces                        */
/* -------------------------------------------------------------------------- */
// 🌟 ইন্টারসেকশনের বদলে ইন্টারফেস ব্যবহার করায় টাইপস্ক্রিপ্ট ইনসার্ট লজিক সহজে বুঝবে
export interface UserDocument extends Omit<User, "_id"> {
  _id?: ObjectId;
}
export interface TopicDocument extends Omit<Topic, "_id"> {
  _id?: ObjectId;
}
export interface ConceptDocument extends Omit<Concept, "_id"> {
  _id?: ObjectId;
  image?: string;
}
export interface NoteDocument extends Omit<Note, "_id"> {
  _id?: ObjectId;
}

/* -------------------------------------------------------------------------- */
/*                        Typed MongoDB Collections                           */
/* -------------------------------------------------------------------------- */
export const usersCollection: Collection<UserDocument> = db.collection("user");
export const sessionCollection: Collection<any> = db.collection("sessions");

export const topicsCollection: Collection<TopicDocument> =
  db.collection("topics");
// 🌟 এবার এই কালেকশনটি ইনসার্ট করার সময় _id ছাড়া ডেটা গ্রহণ করবে!
export const conceptsCollection: Collection<ConceptDocument> =
  db.collection("concepts");

export const notesCollection: Collection<NoteDocument> = db.collection("notes");

export const recommendationsCollection: Collection<Recommendation> =
  db.collection<Recommendation>("recommendations");

export const chatHistoryCollection: Collection<ChatMessage> =
  db.collection<ChatMessage>("chatHistory");
export { client };
