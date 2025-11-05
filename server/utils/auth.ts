import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import { Admin } from "../models";

export interface AuthRequest extends Request {
  adminId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "mannat-secret";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (adminId: string): string => {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): { adminId: string } => {
  return jwt.verify(token, JWT_SECRET) as { adminId: string };
};

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = verifyToken(token);

    // Check if database is connected
    if (mongoose.connection.readyState === 1) {
      // Verify admin still exists only if database is connected
      try {
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) {
          return res.status(401).json({ error: "Invalid token" });
        }
      } catch (dbError) {
        console.warn(
          "Database query failed in auth middleware, proceeding with token validation only:",
          dbError,
        );
        // Continue with just token validation if database query fails
      }
    } else {
      console.warn(
        "Database not connected, proceeding with token validation only",
      );
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ error: "Invalid token" });
    }
    // For other errors (like database connectivity), return 503
    res.status(503).json({ error: "Service temporarily unavailable" });
  }
};
