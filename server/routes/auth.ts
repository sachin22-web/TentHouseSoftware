import { Request, Response } from "express";
import mongoose from "mongoose";
import { Admin } from "../models";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { loginSchema } from "../utils/validation";

// Check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { phone, password } = value;

    // Check if database is connected
    if (!isDatabaseConnected()) {
      return res
        .status(503)
        .json({
          error: "Database connection unavailable. Please try again later.",
        });
    }

    // Find admin by phone
    const admin = await Admin.findOne({ phone });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await comparePassword(password, admin.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken(admin._id.toString());

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    if (
      error.name === "MongooseError" ||
      error.message?.includes("buffering timed out")
    ) {
      return res
        .status(503)
        .json({
          error: "Database connection unavailable. Please try again later.",
        });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createInitialAdmin = async (req: Request, res: Response) => {
  try {
    const { name, phone, password } = req.body;
    console.log("Setup request received:", { name, phone, passwordLength: password?.length });

    if (!name || !phone || !password) {
      console.log("Validation failed - missing fields:", { name: !!name, phone: !!phone, password: !!password });
      return res
        .status(400)
        .json({ error: "Name, phone, and password are required" });
    }

    // Check if database is connected
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error:
          "Database connection unavailable. Please ensure your database is accessible and try again.",
        details:
          "The application requires a database connection to create the admin account. Please check your database configuration.",
        suggestion:
          "Try refreshing the page in a few moments or contact your system administrator.",
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne();
    console.log("Existing admin check:", { existsInDb: !!existingAdmin });
    if (existingAdmin) {
      console.log("Admin already exists, returning 400 error");
      return res.status(400).json({ error: "Admin already exists" });
    }

    const passwordHash = await hashPassword(password);

    const admin = new Admin({
      name,
      phone,
      passwordHash,
      role: "admin",
    });

    await admin.save();

    res.status(201).json({
      message: "Initial admin created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    if (
      error.name === "MongooseError" ||
      error.message?.includes("buffering timed out")
    ) {
      return res.status(503).json({
        error: "Database connection lost during setup. Please try again.",
        details:
          "The database connection was lost while creating the admin account.",
        suggestion:
          "Please wait a moment and try again. If the problem persists, contact your system administrator.",
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const debugAdmins = async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const admins = await Admin.find({}, { passwordHash: 0 }); // Exclude password hash
    res.json({
      count: admins.length,
      admins: admins.map(admin => ({
        id: admin._id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role
      }))
    });
  } catch (error) {
    console.error("Debug admins error:", error);
    res.status(500).json({ error: "Failed to fetch admin data" });
  }
};

export const clearAdmins = async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const result = await Admin.deleteMany({});
    console.log("Cleared admin accounts:", result.deletedCount);
    res.json({
      message: "All admin accounts cleared",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Clear admins error:", error);
    res.status(500).json({ error: "Failed to clear admin accounts" });
  }
};

export const checkSetupStatus = async (req: Request, res: Response) => {
  try {
    const dbConnected = isDatabaseConnected();

    if (!dbConnected) {
      console.warn("Database not connected, assuming setup required");
      return res.json({
        setupRequired: true,
        databaseConnected: false,
        message: "Database connection required for setup",
      });
    }

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database query timeout")), 5000);
    });

    const adminQuery = Admin.findOne();
    const adminExists = await Promise.race([adminQuery, timeoutPromise]);

    res.json({
      setupRequired: !adminExists,
      databaseConnected: true,
      message: adminExists ? "Admin account exists" : "Setup required",
    });
  } catch (error) {
    console.error("Check setup status error:", error);

    // Determine if it's a timeout or connection issue
    const isTimeout =
      error.message?.includes("timeout") ||
      error.message?.includes("buffering timed out");

    res.json({
      setupRequired: true,
      databaseConnected: false,
      error: isTimeout
        ? "Database query timeout"
        : "Database connection failed",
      message: "Unable to verify setup status due to database issues",
    });
  }
};
