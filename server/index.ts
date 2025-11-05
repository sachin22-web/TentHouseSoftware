import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDb from "./db.js";
import { authMiddleware } from "./utils/auth";

// Import route handlers
import {
  loginAdmin,
  createInitialAdmin,
  checkSetupStatus,
  debugAdmins,
  clearAdmins,
} from "./routes/auth";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "./routes/clients";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getItems,
} from "./routes/products";
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  returnInvoice,
  generateInvoicePDFRoute,
} from "./routes/invoices";
import { createInvoicePayment } from "./routes/payments";
import { getEventFinancials } from "./routes/financials";
import {
  getCurrentStock,
  getStockLedger,
  getIssueRegister,
  updateStock,
  getReturnable,
} from "./routes/stock";
import {
  listB2BStock,
  createB2BStock,
  updateB2BStock,
  deleteB2BStock,
  createB2BPurchase,
} from "./routes/b2bStock";
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventSummary,
  saveAgreement,
  dispatchEvent,
  returnEvent,
  generateAgreementPDFRoute,
  getLastReturnSummary,
} from "./routes/events";
import {
  getEventExpenses,
  createEventExpense,
  updateEventExpense,
  deleteEventExpense,
} from "./routes/eventExpenses";
import {
  getEventWorkers,
  createEventWorker,
  updateEventWorker,
  deleteEventWorker,
  createWorkerPayment,
  getWorkerPayments,
} from "./routes/eventWorkers";
import {
  getWorkers,
  getWorker,
  createWorker,
  updateWorker,
  deleteWorker,
  getAttendance,
  markAttendance,
  calculatePayroll,
  createPayroll,
  getPayrolls,
} from "./routes/workers";
import {
  getDashboardSummary,
  getClientReport,
  getProductReport,
  getMonthlyReport,
  getTimeseries,
} from "./routes/reports";
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  logCall,
  convertLead,
  updateLeadStatus,
  updateLeadStatusByClient,
  updateLeadPriority,
  updateLeadPriorityByClient,
} from "./routes/leads";
import {
  createIssueFromInvoice,
  returnItems,
  getIssueSummary,
  getIssueHistory,
} from "./routes/issue";

// Import database health routes
import { dbHealth, dbSelfTest } from "./routes/dbHealth.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize database connection for development
if (process.env.NODE_ENV !== "production") {
  connectDb();
}

// Health check route
app.get("/api/ping", (req, res) => {
  res.json({ message: "Mannat Tent House API is running!" });
});

// Database health and self-test routes (no auth required)
app.get("/api/_db/health", dbHealth);
app.post("/api/_db/selftest", dbSelfTest);

// Auth routes (no middleware needed)
app.get("/api/auth/setup-status", checkSetupStatus);
app.get("/api/auth/debug-admins", debugAdmins);
app.delete("/api/auth/clear-admins", clearAdmins);
app.post("/api/auth/login", loginAdmin);
app.post("/api/auth/setup", createInitialAdmin);

// Protected routes (require authentication)
app.use("/api", authMiddleware);

// Client routes
app.get("/api/clients", getClients);
app.get("/api/clients/:id", getClient);
app.post("/api/clients", createClient);
app.put("/api/clients/:id", updateClient);
app.delete("/api/clients/:id", deleteClient);

// Product routes
app.get("/api/products", getProducts);
app.get("/api/products/categories", getCategories);
app.get("/api/products/:id", getProduct);
app.post("/api/products", createProduct);
app.put("/api/products/:id", updateProduct);
app.delete("/api/products/:id", deleteProduct);
app.get("/api/items", getItems);

// Invoice routes
app.get("/api/invoices", getInvoices);
app.get("/api/invoices/:id", getInvoice);
app.post("/api/invoices", createInvoice);
app.put("/api/invoices/:id", updateInvoice);
app.delete("/api/invoices/:id", deleteInvoice);
app.post("/api/invoices/:id/return", returnInvoice);
app.get("/api/invoices/:id/pdf", generateInvoicePDFRoute);

// Payments
app.post("/api/payments", createInvoicePayment);

// Stock routes
app.get("/api/stock/current", getCurrentStock);
app.get("/api/stock/ledger", getStockLedger);
app.get("/api/issue-register", getIssueRegister);
app.get("/api/stock/returnable", getReturnable);
app.post("/api/stock/update", updateStock);

// B2B stock routes
app.get("/api/b2b-stock", listB2BStock);
app.post("/api/b2b-stock", createB2BStock);
app.put("/api/b2b-stock/:id", updateB2BStock);
app.delete("/api/b2b-stock/:id", deleteB2BStock);
app.post("/api/b2b-stock/:id/purchase", createB2BPurchase);

// Event routes
app.get("/api/events", getEvents);
app.get("/api/events/:id", getEvent);
app.get("/api/events/:id/summary", getEventSummary);
app.get("/api/events/:id/financials", getEventFinancials);
app.put("/api/events/:id/agreement", saveAgreement);
app.patch("/api/events/:id/agreement", saveAgreement);
app.post("/api/events/:id/dispatch", dispatchEvent);
app.post("/api/events/:id/return", returnEvent);
app.get("/api/events/:id/agreement/pdf", generateAgreementPDFRoute);
app.get("/api/events/:id/last-return-summary", getLastReturnSummary);
app.post("/api/events", createEvent);
app.put("/api/events/:id", updateEvent);
app.delete("/api/events/:id", deleteEvent);

// Event expenses routes
app.get("/api/events/:eventId/expenses", getEventExpenses);
app.post("/api/events/:eventId/expenses", createEventExpense);
app.put("/api/events/:eventId/expenses/:expenseId", updateEventExpense);
app.delete("/api/events/:eventId/expenses/:expenseId", deleteEventExpense);

// Event workers routes
app.get("/api/events/:eventId/workers", getEventWorkers);
app.post("/api/events/:eventId/workers", createEventWorker);
app.put("/api/events/:eventId/workers/:workerId", updateEventWorker);
app.delete("/api/events/:eventId/workers/:workerId", deleteEventWorker);

// Worker payments routes
app.get("/api/events/:eventId/workers/:workerId/payments", getWorkerPayments);
app.post(
  "/api/events/:eventId/workers/:workerId/payments",
  createWorkerPayment,
);

// Worker routes
app.get("/api/workers", getWorkers);
app.get("/api/workers/:id", getWorker);
app.post("/api/workers", createWorker);
app.put("/api/workers/:id", updateWorker);
app.delete("/api/workers/:id", deleteWorker);

// Lead routes
app.get("/api/leads", getLeads);
app.get("/api/leads/:id", getLead);
app.post("/api/leads", createLead);
app.put("/api/leads/:id", updateLead);
app.delete("/api/leads/:id", deleteLead);
app.post("/api/leads/:id/call", logCall);
app.post("/api/leads/:id/convert", convertLead);
app.patch("/api/leads/:id/status", updateLeadStatus);
app.patch("/api/leads/by-client/:clientId/status", updateLeadStatusByClient);
app.patch("/api/leads/:id/priority", updateLeadPriority);
app.patch(
  "/api/leads/by-client/:clientId/priority",
  updateLeadPriorityByClient,
);

// Attendance routes
app.get("/api/attendance", getAttendance);
app.post("/api/attendance", markAttendance);

// Payroll routes
app.get("/api/payroll/:workerId/:month", calculatePayroll);
app.post("/api/payroll", createPayroll);
app.get("/api/payroll", getPayrolls);

// Report routes
app.get("/api/reports/summary", getDashboardSummary);
app.get("/api/reports/timeseries", getTimeseries);
app.get("/api/reports/clients", getClientReport);
app.get("/api/reports/products", getProductReport);
app.get("/api/reports/monthly", getMonthlyReport);

// Issue Tracker routes
app.post("/api/issue/from-invoice", createIssueFromInvoice);
app.post("/api/issue/return", returnItems);
app.get("/api/issue/summary", getIssueSummary);
app.get("/api/issue/history", getIssueHistory);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist/spa"));
  app.get(/.*/, (req, res) => {
    res.sendFile("dist/spa/index.html", { root: process.cwd() });
  });
}

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

// Export createServer function for vite integration
export function createServer() {
  return app;
}

// Start server only if this file is run directly
if (
  process.argv[1] === new URL(import.meta.url).pathname ||
  process.env.NODE_ENV === "production"
) {
  connectDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  });
}

export default app;
