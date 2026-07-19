import { MongoClient, Db, Collection } from "mongodb";
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
/*                         Typed MongoDB Collections                          */
/* -------------------------------------------------------------------------- */
export const usersCollection: Collection<User> = db.collection<User>("users");
export const sessionCollection: Collection<any> =
  db.collection<any>("sessions"); // BetterAuth manages session schema dynamically
export const topicsCollection: Collection<Topic> =
  db.collection<Topic>("topics");
export const conceptsCollection: Collection<Concept> =
  db.collection<Concept>("concepts");
export const notesCollection: Collection<Note> = db.collection<Note>("notes");
export const recommendationsCollection: Collection<Recommendation> =
  db.collection<Recommendation>("recommendations");
export const chatHistoryCollection: Collection<ChatMessage> =
  db.collection<ChatMessage>("chatHistory");

export { client };
