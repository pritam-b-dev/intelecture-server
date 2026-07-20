import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn(
    "Warning: GROQ_API_KEY is missing in your environment variables.",
  );
}

const GroqClient = Groq as unknown as new (config: { apiKey: string }) => Groq;

export const groq = new GroqClient({
  apiKey: apiKey || "",
});
