import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn(
    "Warning: ANTHROPIC_API_KEY is missing in your environment variables.",
  );
}

export const anthropic = new Anthropic({
  apiKey: apiKey || "",
});

// 🌟 আগের এবং নতুন দুটোর সাথেই ম্যাচ করার জন্য এলিয়াস (Alias)
export const llm = anthropic;
