import type { Response } from "express";
import mongoose from "mongoose";
import { AuditLog, Client, Event, Lead } from "../models";
import type { AuthRequest } from "../utils/auth";
import { callLogSchema, leadSchema } from "../utils/validation";

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: "Database connection unavailable",
        leads: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }

    const { page = 1, limit = 10, search = "", status = "" } = req.query as any;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { source: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const leads = await Lead.find(query)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ updatedAt: -1 });

    const total = await Lead.countDocuments(query);

    res.json({
      leads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get leads error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLead = async (req: AuthRequest, res: Response) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (error) {
    console.error("Get lead error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = leadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const lead = new Lead(value);
    await lead.save();

    await AuditLog.create({
      action: "create",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { lead },
    });

    res.status(201).json(lead);
  } catch (err: any) {
    console.error("Create lead error:", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "A lead with this phone already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = leadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    await AuditLog.create({
      action: "update",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { lead },
    });

    res.json(lead);
  } catch (error: any) {
    console.error("Update lead error:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "A lead with this phone already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteLead = async (req: AuthRequest, res: Response) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    await AuditLog.create({
      action: "delete",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { leadId: lead._id },
    });

    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logCall = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = callLogSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $push: { callLogs: { ...value, at: value.at || new Date() } } },
      { new: true },
    );

    if (!lead) return res.status(404).json({ error: "Lead not found" });

    await AuditLog.create({
      action: "log-call",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { call: value },
    });

    res.json(lead);
  } catch (error) {
    console.error("Log call error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const convertLead = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const lead = await Lead.findById(req.params.id).session(session);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Upsert Client by phone
    let client = await Client.findOne({ phone: lead.phone }).session(session);
    if (!client) {
      client = new Client({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
      });
      await client.save({ session });
    }

    // Create a draft Event with minimal details
    const now = new Date();
    const event = new Event({
      name: `Event for ${client.name}`,
      clientId: client._id,
      dateFrom: now,
      dateTo: now,
      notes: lead.notes || undefined,
    });
    await event.save({ session });

    // Update Lead status to converted
    lead.status = "converted";
    await lead.save({ session });

    await AuditLog.create(
      [
        {
          action: "convert",
          entity: "Lead",
          entityId: lead._id,
          userId: req.adminId
            ? new mongoose.Types.ObjectId(req.adminId)
            : undefined,
          meta: { clientId: client._id, eventId: event._id },
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const populated = await Event.findById(event._id).populate("clientId");

    res.json({ lead, client, event: populated });
  } catch (error) {
    await session.abortTransaction();
    console.error("Convert lead error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    session.endSession();
  }
};

export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body as { status: any };
    if (!status) return res.status(400).json({ error: "status is required" });
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    await AuditLog.create({
      action: "status",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { status },
    });
    res.json(lead);
  } catch (error) {
    console.error("Update lead status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLeadPriority = async (req: AuthRequest, res: Response) => {
  try {
    const { priority } = req.body as { priority: "hot" | "cold" };
    if (!priority)
      return res.status(400).json({ error: "priority is required" });
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true, runValidators: true },
    );
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    await AuditLog.create({
      action: "priority",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { priority },
    });
    res.json(lead);
  } catch (error) {
    console.error("Update lead priority error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLeadStatusByClient = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { status } = req.body as { status: any };
    if (!status) return res.status(400).json({ error: "status is required" });
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    let lead = await Lead.findOne({ phone: client.phone });
    if (!lead) {
      lead = new Lead({
        name: client.name,
        phone: client.phone,
        email: client.email,
        status,
      });
      await lead.save();
    } else {
      lead.status = status as any;
      await lead.save();
    }

    await AuditLog.create({
      action: "status",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { status, clientId: client._id },
    });

    res.json(lead);
  } catch (error) {
    console.error("Update lead status by client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLeadPriorityByClient = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { priority } = req.body as { priority: "hot" | "cold" };
    if (!priority)
      return res.status(400).json({ error: "priority is required" });
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    let lead = await Lead.findOne({ phone: client.phone });
    if (!lead) {
      lead = new Lead({
        name: client.name,
        phone: client.phone,
        email: client.email,
        priority,
        status: "new",
      });
      await lead.save();
    } else {
      lead.priority = priority;
      await lead.save();
    }

    await AuditLog.create({
      action: "priority",
      entity: "Lead",
      entityId: lead._id,
      userId: req.adminId
        ? new mongoose.Types.ObjectId(req.adminId)
        : undefined,
      meta: { priority, clientId: client._id },
    });

    res.json(lead);
  } catch (error) {
    console.error("Update lead priority by client error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
