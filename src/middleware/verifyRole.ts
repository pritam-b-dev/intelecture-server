import { Request, Response, NextFunction } from "express";

/* -------------------------------------------------------------------------- */
/*                            Role Checker Middleware                         */
/* -------------------------------------------------------------------------- */
export const verifyRole = (allowedRole: "user" | "admin") => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Guard check if session middleware was missed in the route definition
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Session context missing",
      });
    }

    // 2. Return 403 if user role does not match the route permission requirement
    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        status: "error",
        message: `Forbidden: Access restricted to ${allowedRole} accounts only`,
      });
    }

    return next();
  };
};
