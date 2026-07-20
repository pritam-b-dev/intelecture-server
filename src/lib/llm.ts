import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn("GROQ_API_KEY missing");
}

export const groq = {
  chat: {
    completions: {
      create: async (body: any) => {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        return response.json();
      },
    },
  },
};
