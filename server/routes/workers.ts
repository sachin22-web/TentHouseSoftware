import { Response } from "express";
import mongoose from "mongoose";
import { Worker, Attendance, Payroll } from "../models";
import { AuthRequest } from "../utils/auth";
import {
  workerSchema,
  attendanceSchema,
  payrollSchema,
} from "../utils/validation";

// Check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getWorkers = async (req: AuthRequest, res: Response) => {
  try {
    // Check if database is connected
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: "Database connection unavailable",
        workers: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }

    const { page = 1, limit = 10, search = "" } = req.query;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const workers = await Worker.find(query)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ name: 1 });

    const total = await Worker.countDocuments(query);

    res.json({
      workers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get workers error:", error);
    if (
      error.name === "MongooseError" ||
      error.message?.includes("buffering timed out")
    ) {
      return res.status(503).json({
        error: "Database connection unavailable",
        workers: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorker = async (req: AuthRequest, res: Response) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    res.json(worker);
  } catch (error) {
    console.error("Get worker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createWorker = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = workerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const worker = new Worker(value);
    await worker.save();
    res.status(201).json(worker);
  } catch (error) {
    console.error("Create worker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateWorker = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = workerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const worker = await Worker.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    res.json(worker);
  } catch (error) {
    console.error("Update worker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteWorker = async (req: AuthRequest, res: Response) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    res.json({ message: "Worker deleted successfully" });
  } catch (error) {
    console.error("Delete worker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Attendance routes
export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { workerId = "", from = "", to = "", eventId = "" } = req.query;

    const query: any = {};

    if (workerId) {
      query.workerId = workerId;
    }

    if (eventId) {
      query.eventId = eventId;
    }

    // Default to today's range if no dates provided
    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = new Date(from as string);
      endDate = new Date(to as string);
      endDate.setHours(23, 59, 59, 999);
    } else if (from) {
      startDate = new Date(from as string);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (to) {
      endDate = new Date(to as string);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default to today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    query.date = { $gte: startDate, $lte: endDate };

    const attendance = await Attendance.find(query)
      .populate("workerId", "name phone")
      .populate("eventId", "name location")
      .sort({ date: -1, createdAt: -1 });

    res.json({ attendance });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = attendanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Normalize date to start of day for comparison
    const attendanceDate = new Date(value.date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this worker on this date
    const existingAttendance = await Attendance.findOne({
      workerId: value.workerId,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.shift = value.shift;
      if (value.eventId) existingAttendance.eventId = value.eventId;
      if (value.notes !== undefined) existingAttendance.notes = value.notes;
      await existingAttendance.save();

      const populatedAttendance = await Attendance.findById(
        existingAttendance._id,
      )
        .populate("workerId", "name phone")
        .populate("eventId", "name location");

      res.json(populatedAttendance);
    } else {
      // Create new attendance with normalized date
      const attendance = new Attendance({
        ...value,
        date: attendanceDate,
      });
      await attendance.save();

      const populatedAttendance = await Attendance.findById(attendance._id)
        .populate("workerId", "name phone")
        .populate("eventId", "name location");

      res.status(201).json(populatedAttendance);
    }
  } catch (error) {
    console.error("Mark attendance error:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({
          error: "Attendance already marked for this worker on this date",
        });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// Payroll routes
export const calculatePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { workerId, month } = req.params;

    if (!month.match(/^\d{4}-\d{2}$/)) {
      return res
        .status(400)
        .json({ error: "Invalid month format. Use YYYY-MM" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    // Get attendance for the month
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
    );

    const attendance = await Attendance.find({
      workerId,
      date: { $gte: startDate, $lte: endDate },
    });

    let daysFull = 0;
    let daysHalf = 0;

    let daysAbsent = 0;

    attendance.forEach((record) => {
      if (record.shift === "full") daysFull++;
      else if (record.shift === "half") daysHalf++;
      else if (record.shift === "absent") daysAbsent++;
    });

    const halfDayRate = worker.halfDayRate || worker.dailyRate / 2;
    const fullDayAmount = daysFull * worker.dailyRate;
    const halfDayAmount = daysHalf * halfDayRate;
    const totalAmount = fullDayAmount + halfDayAmount;
    const totalWorkingDays = daysFull + daysHalf;
    const year = startDate.getFullYear();

    res.json({
      workerId,
      month,
      year,
      fullDays: daysFull,
      halfDays: daysHalf,
      absentDays: daysAbsent,
      totalWorkingDays,
      fullDayAmount,
      halfDayAmount,
      totalAmount,
      dailyRate: worker.dailyRate,
      halfDayRate,
      attendance,
    });
  } catch (error) {
    console.error("Calculate payroll error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = payrollSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if payroll already exists for this worker and month
    const existingPayroll = await Payroll.findOne({
      workerId: value.workerId,
      month: value.month,
    });

    if (existingPayroll) {
      return res
        .status(400)
        .json({ error: "Payroll already exists for this worker and month" });
    }

    const payroll = new Payroll(value);
    await payroll.save();

    const populatedPayroll = await Payroll.findById(payroll._id).populate(
      "workerId",
      "name dailyRate halfDayRate",
    );

    res.status(201).json(populatedPayroll);
  } catch (error) {
    console.error("Create payroll error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPayrolls = async (req: AuthRequest, res: Response) => {
  try {
    const { workerId = "", month = "" } = req.query;

    const query: any = {};

    if (workerId) {
      query.workerId = workerId;
    }

    if (month) {
      query.month = month;
    }

    const payrolls = await Payroll.find(query)
      .populate("workerId", "name dailyRate halfDayRate")
      .sort({ month: -1 });

    res.json(payrolls);
  } catch (error) {
    console.error("Get payrolls error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
