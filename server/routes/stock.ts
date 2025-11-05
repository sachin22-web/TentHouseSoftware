import { Response } from "express";
import { Product, StockLedger, IssueRegister, Event, B2BStock, ManualB2BAllocation } from "../models";
import { AuthRequest } from "../utils/auth";
import { stockUpdateSchema } from "../utils/validation";
import { consumeProductStock } from "../utils/b2bStock";

export const getCurrentStock = async (req: AuthRequest, res: Response) => {
  try {
    const { search = "", category = "", stockLevel = "" } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    let products = await Product.find(query).sort({ name: 1 });

    // Apply stock level filter
    if (stockLevel) {
      switch (stockLevel) {
        case "out":
          products = products.filter((p) => p.stockQty === 0);
          break;
        case "low":
          products = products.filter((p) => p.stockQty > 0 && p.stockQty < 10);
          break;
        case "medium":
          products = products.filter(
            (p) => p.stockQty >= 10 && p.stockQty <= 50,
          );
          break;
        case "good":
          products = products.filter((p) => p.stockQty > 50);
          break;
      }
    }

    res.json({ products });
  } catch (error) {
    console.error("Get current stock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStockLedger = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      productId = "",
      reason = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const query: any = {};

    if (productId) {
      query.productId = productId;
    }

    if (reason) {
      query.reason = reason;
    }

    if (fromDate || toDate) {
      query.at = {};
      if (fromDate) query.at.$gte = new Date(fromDate as string);
      if (toDate) query.at.$lte = new Date(toDate as string);
    }

    const ledgerEntries = await StockLedger.find(query)
      .populate("productId", "name category unitType")
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ at: -1 });

    const total = await StockLedger.countDocuments(query);

    // Transform ledger entries to match frontend expectations
    const transformedEntries = ledgerEntries.map((entry) => ({
      _id: entry._id,
      productId: entry.productId,
      type:
        entry.qtyChange > 0 ? "in" : entry.qtyChange < 0 ? "out" : "adjustment",
      quantity: Math.abs(entry.qtyChange),
      reason: "Manual stock update",
      balanceAfter: 0, // We don't track this in current model
      date: entry.at,
      createdAt: entry.createdAt,
    }));

    res.json({
      ledger: transformedEntries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get stock ledger error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getIssueRegister = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const issueRegisters = await IssueRegister.find({})
      .populate("productId", "name category unitType")
      .populate("clientId", "name phone")
      .limit(Number(limit))
      .sort({ issueDate: -1 });

    res.json({ issues: issueRegisters });
  } catch (error) {
    console.error("Get issue register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getReturnable = async (req: AuthRequest, res: Response) => {
  try {
    // Fetch recent events that are not explicitly closed
    const events = await Event.find({
      $or: [
        { returnClosed: { $ne: true } },
        { returnClosed: { $exists: false } },
      ],
    })
      .populate("clientId", "name phone")
      .sort({ dateFrom: -1 })
      .limit(200);

    const result: any[] = [];

    for (const ev of events) {
      const lastDispatch =
        ev.dispatches && ev.dispatches.length
          ? ev.dispatches[ev.dispatches.length - 1]
          : null;
      const lines = lastDispatch ? lastDispatch.items : ev.selections || [];
      const hasOutstanding = lines.some((li: any) => {
        const dispatched = Number(li.qtyToSend || li.qty || 0);
        const ret = Number(li.returnedQty || 0);
        return dispatched > ret;
      });
      if (!hasOutstanding) continue;
      result.push({
        _id: ev._id,
        name: ev.name,
        client: ev.clientId,
        dateFrom: ev.dateFrom,
        dateTo: ev.dateTo,
        status: ev.status,
      });
    }

    res.json({ events: result });
  } catch (error) {
    console.error("Get returnable events error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = stockUpdateSchema.validate(req.body);
    if (error) {
      console.log("Stock update validation error:", error.details);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { productId, type, quantity, reason } = value;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let qtyChange = 0;
    let newQty = product.stockQty;
    let allocation = null as
      | (Awaited<ReturnType<typeof consumeProductStock>> & { reason: string })
      | null;

    if (type === "in") {
      // Determine repayments: use user-provided mapping if present; otherwise auto-repay FIFO from outstanding B2B borrowings
      let repayments: Array<{ stockId: string; quantity: number }> = Array.isArray((req.body as any).b2bRepayments)
        ? (req.body as any).b2bRepayments
        : [];

      // Auto-calculate repayments if none provided
      if (!repayments.length) {
        const debts = await ManualB2BAllocation.find({
          productId: product._id,
          totalRemaining: { $gt: 0 },
        }).sort({ createdAt: 1 });
        let remaining = quantity;
        const auto: Array<{ stockId: string; quantity: number }> = [];
        for (const debt of debts) {
          if (remaining <= 0) break;
          for (const alloc of debt.allocations) {
            if (remaining <= 0) break;
            if (alloc.quantityRemaining <= 0) continue;
            const giveBack = Math.min(alloc.quantityRemaining, remaining);
            auto.push({ stockId: String(alloc.stockId), quantity: giveBack });
            alloc.quantityRemaining -= giveBack;
            remaining -= giveBack;
          }
          debt.totalRemaining = (debt.allocations || []).reduce(
            (sum, a) => sum + Number(a.quantityRemaining || 0),
            0,
          );
          await debt.save();
        }
        repayments = auto;
      }

      const totalRepay = repayments.reduce(
        (sum, r) => sum + Number(r.quantity || 0),
        0,
      );
      if (totalRepay > quantity) {
        return res
          .status(400)
          .json({ error: "B2B repayments cannot exceed total stock-in quantity" });
      }

      // Apply B2B repayments
      for (const r of repayments) {
        await B2BStock.findByIdAndUpdate(r.stockId, {
          $inc: { quantityAvailable: r.quantity },
        });
      }

      // If user provided a mapping, reduce tracked debt accordingly
      if ((req.body as any).b2bRepayments && (repayments || []).length) {
        const debts = await ManualB2BAllocation.find({
          productId: product._id,
          totalRemaining: { $gt: 0 },
        }).sort({ createdAt: 1 });
        let repayLeft = totalRepay;
        for (const debt of debts) {
          if (repayLeft <= 0) break;
          for (const alloc of debt.allocations) {
            if (repayLeft <= 0) break;
            const r = repayments.find((x) => String(x.stockId) === String(alloc.stockId));
            if (!r) continue;
            const giveBack = Math.min(alloc.quantityRemaining, r.quantity);
            alloc.quantityRemaining -= giveBack;
            r.quantity -= giveBack;
            repayLeft -= giveBack;
          }
          debt.totalRemaining = (debt.allocations || []).reduce(
            (sum, a) => sum + Number(a.quantityRemaining || 0),
            0,
          );
          await debt.save();
        }
      }

      // Remaining goes to main stock
      const toMain = quantity - totalRepay;
      if (toMain > 0) {
        product.stockQty = product.stockQty + toMain;
        await product.save();
      }
      newQty = product.stockQty;
      qtyChange = toMain;
    } else if (type === "out") {
      const result = await consumeProductStock({
        product,
        quantity,
      });
      newQty = result.projectedStock;
      allocation = { ...result, reason: "manual" };
      // Record B2B borrowings for future repayment on manual stock-in
      if (result.b2bUsed > 0 && result.b2bUsages.length > 0) {
        const doc = new ManualB2BAllocation({
          productId: product._id,
          allocations: result.b2bUsages.map((u) => ({
            stockId: u.stockId,
            quantityRemaining: u.quantity,
            supplierName: u.supplierName,
          })),
        });
        await doc.save();
      }
      // qtyChange should reflect only change in main stock (negative of mainUsed)
      qtyChange = -result.mainUsed;
    } else if (type === "adjustment") {
      qtyChange = quantity - product.stockQty;
      newQty = quantity;
      product.stockQty = newQty;
      await product.save();
    }

    const stockEntry = new StockLedger({
      productId,
      qtyChange,
      reason: "manual",
      refType: "Invoice",
      refId: product._id,
    });
    await stockEntry.save();

    res.json({
      message: "Stock updated successfully",
      product,
      ledgerEntry: stockEntry,
      allocation,
      details: allocation
        ? {
            mainUsed: allocation.mainUsed,
            b2bUsed: allocation.b2bUsed,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Update stock error:", error);
    if ((error as any)?.code === "INSUFFICIENT_STOCK") {
      return res
        .status(400)
        .json({ error: "Insufficient stock for this operation" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
