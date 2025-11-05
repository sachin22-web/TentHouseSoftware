import { Response } from "express";
import { AuthRequest } from "../utils/auth";
import { Invoice, Payment } from "../models";

function to2(n: number) {
  return Number(n.toFixed(2));
}

export const getEventFinancials = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoices = await Invoice.find({ eventId: id }).select(
      "number date totals clientId",
    );

    const payments = await Payment.find({ eventId: id })
      .select("date amount mode ref invoiceId clientId")
      .sort({ date: -1 });

    const billed = to2(
      invoices.reduce((s, inv) => s + Number(inv.totals?.grandTotal || 0), 0),
    );
    const paid = to2(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
    const pending = Math.max(0, to2(billed - paid));

    const invList = invoices.map((inv) => ({
      _id: String(inv._id),
      number: inv.number,
      date: inv.date,
      total: to2(Number(inv.totals?.grandTotal || 0)),
      paid: to2(Number(inv.totals?.paid || 0)),
      pending: Math.max(0, to2(Number(inv.totals?.pending || 0))),
    }));

    const payList = payments.map((p) => ({
      _id: String(p._id),
      at: p.date,
      amount: to2(Number(p.amount || 0)),
      mode: p.mode,
      ref: p.ref || "",
      invoiceId: String(p.invoiceId),
      clientId: p.clientId ? String(p.clientId) : undefined,
    }));

    res.json({
      totals: { billed, paid, pending },
      invoices: invList,
      payments: payList,
    });
  } catch (e) {
    console.error("Get event financials error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};
