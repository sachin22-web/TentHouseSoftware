import { Response } from "express";
import mongoose from "mongoose";
import { Client } from "../models";
import { AuthRequest } from "../utils/auth";
import { clientSchema } from "../utils/validation";

// Check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    // Check if database is connected
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: "Database connection unavailable",
        clients: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }

    const { page = 1, limit = 10, search = "" } = req.query;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
            { gstNumber: { $regex: search, $options: "i" } },
            { eventName: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const clients = await Client.find(query)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ name: 1 });

    const total = await Client.countDocuments(query);

    res.json({
      clients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get clients error:", error);
    if (
      error.name === "MongooseError" ||
      error.message?.includes("buffering timed out")
    ) {
      return res.status(503).json({
        error: "Database connection unavailable",
        clients: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getClient = async (req: AuthRequest, res: Response) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(client);
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const client = new Client(value);
    await client.save();
    res.status(201).json(client);
  } catch (error: any) {
    console.error("Create client error:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "A client with this phone number already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateClient = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const client = await Client.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (error: any) {
    console.error("Update client error:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "A client with this phone number already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
