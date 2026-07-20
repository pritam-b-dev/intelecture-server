import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
// NodeNext requires .js extension for local imports
import { db } from "./db.js";

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  // Native MongoDB instance passed directly to the adapter
  database: mongodbAdapter(db),

  // 1. Credentials Provider
  emailAndPassword: {
    enabled: true,
  },

  // 2. OAuth Providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },

  // 3. Custom Database Fields Schema
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      learningLevel: {
        type: "string",
        defaultValue: "beginner",
      },
    },
  },

  // 4. Cross-Origin Cookie Attributes for Subdomains/Different Domains
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },

  // 5. Security Guardrails for client requests
  trustedOrigins: [clientUrl, "http://localhost:3000"],
});
