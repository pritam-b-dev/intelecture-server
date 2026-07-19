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
    const webHeaders = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => webHeaders.append(key, v));
      } else if (value) {
        webHeaders.set(key, String(value));
      }
    });

    const sessionData = await auth.api.getSession({
      headers: webHeaders,
    });

    console.log("==================================");
    console.log("COOKIE =", req.headers.cookie);
    console.log("SESSION DATA =", sessionData);
    console.log("==================================");

    if (!sessionData || !sessionData.session || !sessionData.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const { session, user: authUser } = sessionData;

    let user = await usersCollection.findOne({
      id: session.userId,
    });

    if (!user) {
      user = await usersCollection.findOne({
        email: authUser.email,
      });
    }

    if (!user && session.userId) {
      try {
        user = await usersCollection.findOne({
          _id: session.userId as any,
        });
      } catch {}
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }

    req.user = {
      id: user.id ?? user._id.toString(),
      email: user.email,
      role: (user.role ?? "user") as "user" | "admin",
      learningLevel: user.learningLevel,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      status: "error",
      message: "Unauthorized",
    });
  }
};
