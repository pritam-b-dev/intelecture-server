import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { usersCollection } from "../lib/db.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "user" | "admin";
        learningLevel?: string;
        name: string;
      };
    }
  }
}

export const verifySession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    //  Node.js (Express) হেডারকে Web Standard Headers অবজেক্টে রূপান্তর করুন
    const webHeaders = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => webHeaders.append(key, v));
      } else if (value) {
        webHeaders.set(key, value);
      }
    });

    //  এবার BetterAuth-এর কাছে স্ট্যান্ডার্ড ওয়েব হেডারটি পাস করুন
    const sessionData = await auth.api.getSession({
      headers: webHeaders,
    });

    if (!sessionData || !sessionData.session) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Invalid or expired session",
      });
    }

    const { session } = sessionData;

    const user = await usersCollection.findOne({
      $or: [{ id: session.userId }, { _id: session.userId as any }],
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Associated user record not found",
      });
    }

    req.user = {
      id: user.id || user._id.toString(),
      email: user.email,
      role: user.role as "user" | "admin",
      learningLevel: user.learningLevel,
      name: user.name,
    };

    return next();
  } catch (error) {
    console.error("[Middleware Error - verifySession]:", error);
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Session verification failed",
    });
  }
};
