import { Response } from "express";
import { EventExpense, Event } from "../models";
import { AuthRequest } from "../utils/auth";
import { eventExpenseSchema } from "../utils/validation";

export const getEventExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const expenses = await EventExpense.find({ eventId }).sort({ date: -1 });

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    res.json({
      expenses,
      total,
    });
  } catch (error) {
    console.error("Get event expenses error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createEventExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const { error, value } = eventExpenseSchema.validate(req.body);
    if (error) {
      console.error(
        "Event expense validation failed (create). Body:",
        req.body,
        "Details:",
        error.details,
      );
      return res.status(400).json({ error: error.details[0].message });
    }

    const expense = new EventExpense({
      eventId,
      ...value,
    });

    await expense.save();

    res.status(201).json(expense);
  } catch (error) {
    console.error("Create event expense error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateEventExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, expenseId } = req.params;

    const { error, value } = eventExpenseSchema.validate(req.body);
    if (error) {
      console.error(
        "Event expense validation failed (update). Body:",
        req.body,
        "Details:",
        error.details,
      );
      return res.status(400).json({ error: error.details[0].message });
    }

    const expense = await EventExpense.findOneAndUpdate(
      { _id: expenseId, eventId },
      value,
      { new: true, runValidators: true },
    );

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    console.error("Update event expense error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteEventExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, expenseId } = req.params;

    const expense = await EventExpense.findOneAndDelete({
      _id: expenseId,
      eventId,
    });
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete event expense error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
