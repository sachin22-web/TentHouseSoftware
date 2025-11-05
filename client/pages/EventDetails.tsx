import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  Receipt,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  User,
  CreditCard,
  FileText,
  Camera,
  Download,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import api, { getAuthToken } from "@/lib/api";
import { useParams, useSearchParams, Link } from "react-router-dom";

interface Event {
  _id: string;
  name: string;
  location?: string;
  clientId?: {
    _id: string;
    name: string;
    phone: string;
  };
  dateFrom: string;
  dateTo: string;
  notes?: string;
  budget?: number;
  estimate?: number;
  createdAt: string;
}

interface EventWorker {
  _id: string;
  eventId: string;
  name: string;
  role: string;
  phone?: string;
  payRate: number;
  agreedAmount?: number;
  totalPaid: number;
  remainingAmount: number;
  createdAt: string;
}

interface EventExpense {
  _id: string;
  eventId: string;
  category: "travel" | "food" | "material" | "misc";
  amount: number;
  notes?: string;
  date: string;
  billImage?: string;
  createdAt: string;
}

interface WorkerPayment {
  _id: string;
  eventId: string;
  workerId: string;
  amount: number;
  paymentMode: "cash" | "bank_transfer" | "upi" | "cheque" | "online";
  paymentDate: string;
  notes?: string;
  referenceNumber?: string;
  createdAt: string;
}

interface EventSummary {
  budget: number;
  estimate: number;
  totalExpenses: number;
  totalWorkerCost: number;
  totalPaidToWorkers: number;
  totalSpent: number;
  budgetBalance: number;
  estimateBalance: number;
  remainingWorkerPayments: number;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";

  const [event, setEvent] = useState<Event | null>(null);
  const [workers, setWorkers] = useState<EventWorker[]>([]);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Financials
  const [financials, setFinancials] = useState<{
    totals: { billed: number; paid: number; pending: number };
    invoices: {
      _id: string;
      number: string;
      date: string;
      total: number;
      paid: number;
      pending: number;
    }[];
    payments: {
      _id: string;
      at: string;
      amount: number;
      mode: string;
      ref: string;
      invoiceId: string;
    }[];
  } | null>(null);

  // Worker modal state
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<EventWorker | null>(null);
  const [workerFormData, setWorkerFormData] = useState({
    name: "",
    role: "",
    phone: "",
    payRate: "",
    agreedAmount: "",
  });

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<EventExpense | null>(
    null,
  );
  const [expenseFormData, setExpenseFormData] = useState({
    category: "travel" as const,
    amount: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
    billImage: "",
  });

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<EventWorker | null>(
    null,
  );
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    paymentMode: "cash" as const,
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
    referenceNumber: "",
  });

  // Filter and search state
  const [workerSearchTerm, setWorkerSearchTerm] = useState("");
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseDateFilter, setExpenseDateFilter] = useState("");
  const [workerRoleFilter, setWorkerRoleFilter] = useState("all");

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchEventSummary();
      fetchFinancials();
      if (activeTab === "workers") fetchWorkers();
      if (activeTab === "expenses") fetchExpenses();
    }
  }, [id, activeTab]);

  useEffect(() => {
    const onPaymentsUpdated = (e: any) => {
      if (!id) return;
      if (!e?.detail?.eventId || String(e.detail.eventId) === String(id)) {
        fetchFinancials();
      }
    };
    window.addEventListener("payments:updated", onPaymentsUpdated);
    return () =>
      window.removeEventListener("payments:updated", onPaymentsUpdated);
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to fetch event details");
    }
  };

  const fetchEventSummary = async () => {
    try {
      const res = await api.get(`/events/${id}/summary`);
      setSummary(res.data.summary);
    } catch (error) {
      console.error("Error fetching event summary:", error);
    }
  };

  const fetchFinancials = async () => {
    try {
      const res = await api.get(`/events/${id}/financials`);
      setFinancials(res.data);
    } catch (e) {
      console.error("Error fetching financials", e);
    }
  };

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}/workers`);
      setWorkers(res.data.workers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast.error("Failed to fetch workers");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}/expenses`);
      setExpenses(res.data.expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const resetWorkerForm = () => {
    setWorkerFormData({
      name: "",
      role: "",
      phone: "",
      payRate: "",
      agreedAmount: "",
    });
    setEditingWorker(null);
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      category: "travel",
      amount: "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
      billImage: "",
    });
    setEditingExpense(null);
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      amount: "",
      paymentMode: "cash",
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
      referenceNumber: "",
    });
    setSelectedWorker(null);
  };

  const openWorkerModal = (worker?: EventWorker) => {
    if (worker) {
      setWorkerFormData({
        name: worker.name,
        role: worker.role,
        phone: worker.phone || "",
        payRate: worker.payRate.toString(),
        agreedAmount: worker.agreedAmount?.toString() || "",
      });
      setEditingWorker(worker);
    } else {
      resetWorkerForm();
    }
    setShowWorkerModal(true);
  };

  const openExpenseModal = (expense?: EventExpense) => {
    if (expense) {
      setExpenseFormData({
        category: expense.category,
        amount: expense.amount.toString(),
        notes: expense.notes || "",
        date: new Date(expense.date).toISOString().slice(0, 10),
        billImage: expense.billImage || "",
      });
      setEditingExpense(expense);
    } else {
      resetExpenseForm();
    }
    setShowExpenseModal(true);
  };

  const openPaymentModal = (worker: EventWorker) => {
    setSelectedWorker(worker);
    setPaymentFormData({
      ...paymentFormData,
      amount: worker.remainingAmount.toString(),
    });
    setShowPaymentModal(true);
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !workerFormData.name ||
      !workerFormData.role ||
      !workerFormData.payRate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const url = editingWorker
        ? `/events/${id}/workers/${editingWorker._id}`
        : `/events/${id}/workers`;
      const method = editingWorker ? "PUT" : "POST";

      const payload = {
        ...workerFormData,
        payRate: parseFloat(workerFormData.payRate),
        agreedAmount: workerFormData.agreedAmount
          ? parseFloat(workerFormData.agreedAmount)
          : undefined,
      };

      const res = await api({ method, url, data: payload });
      if (res.status >= 200 && res.status < 300) {
        toast.success(
          `Worker ${editingWorker ? "updated" : "created"} successfully`,
        );
        setShowWorkerModal(false);
        resetWorkerForm();
        fetchWorkers();
        fetchEventSummary();
      } else {
        toast.error(res.data?.error || "Failed to save worker");
      }
    } catch (error) {
      console.error("Error saving worker:", error);
      toast.error("Failed to save worker");
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseFormData.amount || !expenseFormData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const url = editingExpense
        ? `/events/${id}/expenses/${editingExpense._id}`
        : `/events/${id}/expenses`;
      const method = editingExpense ? "PUT" : "POST";

      const amountNum = Number(
        String(expenseFormData.amount).replace(/[,\s₹]/g, ""),
      );
      if (!Number.isFinite(amountNum) || amountNum < 0) {
        toast.error("Enter a valid amount");
        setLoading(false);
        return;
      }

      const dateIso = new Date(expenseFormData.date).toISOString();

      const payload = {
        category: expenseFormData.category,
        amount: Number(amountNum.toFixed(2)),
        notes: expenseFormData.notes || undefined,
        date: dateIso,
        billImage: expenseFormData.billImage || undefined,
      };

      const res = await api({ method, url, data: payload });
      if (res.status >= 200 && res.status < 300) {
        toast.success(
          `Expense ${editingExpense ? "updated" : "created"} successfully`,
        );
        setShowExpenseModal(false);
        resetExpenseForm();
        fetchExpenses();
        fetchEventSummary();
      } else {
        toast.error(res.data?.error || "Failed to save expense");
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save expense";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentFormData.amount || !selectedWorker) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const rawAmount = parseFloat(paymentFormData.amount);
      const remaining = Number(selectedWorker.remainingAmount || 0);
      const safeAmount = Math.min(Math.max(rawAmount, 0), remaining);

      const payload: any = {
        amount: Number(safeAmount.toFixed(2)),
        paymentMode: paymentFormData.paymentMode,
        paymentDate: new Date(paymentFormData.paymentDate).toISOString(),
      };
      if (paymentFormData.referenceNumber?.trim()) {
        payload.referenceNumber = paymentFormData.referenceNumber.trim();
      }
      if (paymentFormData.notes?.trim()) {
        payload.notes = paymentFormData.notes.trim();
      }

      const res = await api.post(
        `/events/${id}/workers/${selectedWorker._id}/payments`,
        payload,
      );
      if (res.status >= 200 && res.status < 300) {
        toast.success("Payment recorded successfully");
        setShowPaymentModal(false);
        resetPaymentForm();
        fetchWorkers();
        fetchEventSummary();
      } else {
        toast.error(res.data?.error || "Failed to record payment");
      }
    } catch (error: any) {
      console.error("Error recording payment:", error);
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to record payment";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this worker? All associated payments will also be deleted.",
      )
    )
      return;

    try {
      const res = await api.delete(`/events/${id}/workers/${workerId}`);
      if (res.status >= 200 && res.status < 300) {
        toast.success("Worker deleted successfully");
        fetchWorkers();
        fetchEventSummary();
      } else {
        toast.error(res.data?.error || "Failed to delete worker");
      }
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast.error("Failed to delete worker");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const res = await api.delete(`/events/${id}/expenses/${expenseId}`);
      if (res.status >= 200 && res.status < 300) {
        toast.success("Expense deleted successfully");
        fetchExpenses();
        fetchEventSummary();
      } else {
        toast.error(res.data?.error || "Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  // Filter functions
  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(workerSearchTerm.toLowerCase()) ||
      worker.role.toLowerCase().includes(workerSearchTerm.toLowerCase()) ||
      (worker.phone && worker.phone.includes(workerSearchTerm));
    const matchesRole =
      workerRoleFilter === "all" ||
      worker.role.toLowerCase().includes(workerRoleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.notes?.toLowerCase().includes(expenseSearchTerm.toLowerCase()) ||
      false;
    const matchesCategory =
      expenseCategoryFilter === "all" ||
      expense.category === expenseCategoryFilter;
    const matchesDate =
      !expenseDateFilter ||
      new Date(expense.date).toISOString().slice(0, 7) === expenseDateFilter;
    return matchesSearch && matchesCategory && matchesDate;
  });

  const clearWorkerFilters = () => {
    setWorkerSearchTerm("");
    setWorkerRoleFilter("all");
  };

  const clearExpenseFilters = () => {
    setExpenseSearchTerm("");
    setExpenseCategoryFilter("all");
    setExpenseDateFilter("");
  };

  // Export functions
  const exportWorkersCSV = () => {
    if (workers.length === 0) {
      toast.error("No workers to export");
      return;
    }

    const headers = [
      "Name",
      "Role",
      "Phone",
      "Pay Rate",
      "Agreed Amount",
      "Total Paid",
      "Remaining Amount",
    ];
    const csvData = workers.map((worker) => [
      worker.name,
      worker.role,
      worker.phone || "",
      worker.payRate,
      worker.agreedAmount || "",
      worker.totalPaid,
      worker.remainingAmount,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.name || "event"}-workers.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Workers data exported successfully");
  };

  const exportExpensesCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }

    const headers = ["Date", "Category", "Amount", "Notes"];
    const csvData = expenses.map((expense) => [
      formatDate(expense.date),
      expense.category,
      expense.amount,
      expense.notes || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.name || "event"}-expenses.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Expenses data exported successfully");
  };

  const exportSummaryCSV = () => {
    if (!summary || !event) {
      toast.error("No summary data to export");
      return;
    }

    const summaryData = [
      ["Event Name", event.name],
      [
        "Event Dates",
        `${formatDate(event.dateFrom)} - ${formatDate(event.dateTo)}`,
      ],
      ["Client", event.clientId?.name || "No client"],
      ["Location", event.location || "No location"],
      ["Budget", summary.budget],
      ["Estimate", summary.estimate],
      ["Total Expenses", summary.totalExpenses],
      ["Total Worker Cost", summary.totalWorkerCost],
      ["Total Paid to Workers", summary.totalPaidToWorkers],
      ["Total Spent", summary.totalSpent],
      ["Budget Balance", summary.budgetBalance],
      ["Estimate Balance", summary.estimateBalance],
      ["Remaining Worker Payments", summary.remainingWorkerPayments],
    ];

    const csvContent = summaryData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.name || "event"}-summary.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Summary data exported successfully");
  };

  if (!event) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="text-muted-foreground">
              {formatDate(event.dateFrom)} - {formatDate(event.dateTo)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportSummaryCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export Summary (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportWorkersCSV}>
                <Users className="h-4 w-4 mr-2" />
                Export Workers (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExpensesCSV}>
                <Receipt className="h-4 w-4 mr-2" />
                Export Expenses (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.budget)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalSpent)}
              </div>
              <p className="text-xs text-muted-foreground">
                Expenses: {formatCurrency(summary.totalExpenses)} | Workers:{" "}
                {formatCurrency(summary.totalPaidToWorkers)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Budget Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${summary.budgetBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(summary.budgetBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.remainingWorkerPayments)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Client Payments */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Client Payments
                  {financials?.totals?.pending === 0 && (
                    <Badge className="ml-2 bg-green-600 text-white">Paid</Badge>
                  )}
                </CardTitle>
                {event?.clientId?._id && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/invoices?clientId=${event.clientId._id}`}>
                      View all invoices for this client
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Totals row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Billed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {financials
                        ? `₹${(financials.totals.billed ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {financials
                        ? `₹${(financials.totals.paid ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${financials && financials.totals.pending === 0 ? "text-green-600" : ""}`}
                    >
                      {financials
                        ? `₹${(financials.totals.pending ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Invoices */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Invoices</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financials && financials.invoices.length > 0 ? (
                        financials.invoices.map((inv) => (
                          <TableRow key={inv._id}>
                            <TableCell className="font-medium">
                              {inv.number}
                            </TableCell>
                            <TableCell>{formatDate(inv.date)}</TableCell>
                            <TableCell className="text-right">
                              ₹
                              {inv.total.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹
                              {inv.paid.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell
                              className={`text-right ${inv.pending === 0 ? "text-green-600" : ""}`}
                            >
                              ₹
                              {inv.pending.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="sm">
                                <Link to="/invoices" title="Open Invoices">
                                  <ArrowLeft className="rotate-180 h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
                            —
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Payments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Payments</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financials && financials.payments.length > 0 ? (
                        financials.payments.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell>{formatDate(p.at)}</TableCell>
                            <TableCell className="text-right">
                              ₹
                              {p.amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="uppercase">
                              {p.mode}
                            </TableCell>
                            <TableCell>{p.ref || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="sm">
                                <Link to="/invoices" title="View Invoice">
                                  <ArrowLeft className="rotate-180 h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            —
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Event Details
                {event?.status === "reserved" && (
                  <Badge variant="secondary" className="text-xs">
                    Reserved
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Client</Label>
                  <p>
                    {event.clientId
                      ? event.clientId.name
                      : "No client assigned"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Location</Label>
                  <p>{event.location || "No location specified"}</p>
                </div>
                <div>
                  <Label className="font-medium">Budget</Label>
                  <p>
                    {event.budget
                      ? formatCurrency(event.budget)
                      : "No budget set"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Estimate</Label>
                  <p>
                    {event.estimate
                      ? formatCurrency(event.estimate)
                      : "No estimate set"}
                  </p>
                </div>
                {event.notes && (
                  <div className="md:col-span-2">
                    <Label className="font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground">
                      {event.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Workers Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportWorkersCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={() => openWorkerModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Worker
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Search Workers</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, role, or phone..."
                        value={workerSearchTerm}
                        onChange={(e) => setWorkerSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Filter by Role</Label>
                    <Select
                      value={workerRoleFilter}
                      onValueChange={setWorkerRoleFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="helper">Helper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    {(workerSearchTerm || workerRoleFilter !== "all") && (
                      <Button variant="outline" onClick={clearWorkerFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {workers.length === 0
                    ? "No workers added yet. Add your first worker to get started."
                    : "No workers match the current filters."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Pay Rate</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.map((worker) => (
                      <TableRow key={worker._id}>
                        <TableCell className="font-medium">
                          {worker.name}
                        </TableCell>
                        <TableCell>{worker.role}</TableCell>
                        <TableCell>{worker.phone || "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(
                            worker.agreedAmount || worker.payRate,
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(worker.totalPaid)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              worker.remainingAmount > 0
                                ? "text-orange-600"
                                : "text-green-600"
                            }
                          >
                            {formatCurrency(worker.remainingAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openWorkerModal(worker)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentModal(worker)}
                              disabled={worker.remainingAmount <= 0}
                            >
                              <CreditCard className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteWorker(worker._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expenses Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportExpensesCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={() => openExpenseModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Search Expenses</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by notes..."
                        value={expenseSearchTerm}
                        onChange={(e) => setExpenseSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={expenseCategoryFilter}
                      onValueChange={setExpenseCategoryFilter}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="misc">Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Month/Year</Label>
                    <Input
                      type="month"
                      value={expenseDateFilter}
                      onChange={(e) => setExpenseDateFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    {(expenseSearchTerm ||
                      expenseCategoryFilter !== "all" ||
                      expenseDateFilter) && (
                      <Button variant="outline" onClick={clearExpenseFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {expenses.length === 0
                    ? "No expenses recorded yet. Add your first expense to get started."
                    : "No expenses match the current filters."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>{expense.notes || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openExpenseModal(expense)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Worker Modal */}
      <Dialog open={showWorkerModal} onOpenChange={setShowWorkerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorker ? "Edit Worker" : "Add New Worker"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWorkerSubmit} className="space-y-4">
            <div>
              <Label htmlFor="workerName">Name *</Label>
              <Input
                id="workerName"
                value={workerFormData.name}
                onChange={(e) =>
                  setWorkerFormData({ ...workerFormData, name: e.target.value })
                }
                placeholder="Worker name"
                required
              />
            </div>

            <div>
              <Label htmlFor="workerRole">Role *</Label>
              <Input
                id="workerRole"
                value={workerFormData.role}
                onChange={(e) =>
                  setWorkerFormData({ ...workerFormData, role: e.target.value })
                }
                placeholder="Worker role"
                required
              />
            </div>

            <div>
              <Label htmlFor="workerPhone">Phone</Label>
              <Input
                id="workerPhone"
                value={workerFormData.phone}
                onChange={(e) =>
                  setWorkerFormData({
                    ...workerFormData,
                    phone: e.target.value,
                  })
                }
                placeholder="Phone number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payRate">Pay Rate (₹) *</Label>
                <Input
                  id="payRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={workerFormData.payRate}
                  onChange={(e) =>
                    setWorkerFormData({
                      ...workerFormData,
                      payRate: e.target.value,
                    })
                  }
                  placeholder="Pay rate"
                  required
                />
              </div>

              <div>
                <Label htmlFor="agreedAmount">Agreed Amount (₹)</Label>
                <Input
                  id="agreedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={workerFormData.agreedAmount}
                  onChange={(e) =>
                    setWorkerFormData({
                      ...workerFormData,
                      agreedAmount: e.target.value,
                    })
                  }
                  placeholder="Agreed amount (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWorkerModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingWorker
                    ? "Update Worker"
                    : "Add Worker"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expenseCategory">Category *</Label>
                <Select
                  value={expenseFormData.category}
                  onValueChange={(value) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      category: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expenseAmount">Amount (₹) *</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseFormData.amount}
                  onChange={(e) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      amount: e.target.value,
                    })
                  }
                  placeholder="Amount"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="expenseDate">Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseFormData.date}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    date: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="expenseNotes">Notes</Label>
              <Textarea
                id="expenseNotes"
                value={expenseFormData.notes}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    notes: e.target.value,
                  })
                }
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExpenseModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingExpense
                    ? "Update Expense"
                    : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedWorker?.name}</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Amount:</span>{" "}
                  {formatCurrency(
                    selectedWorker.agreedAmount || selectedWorker.payRate,
                  )}
                </div>
                <div>
                  <span className="font-medium">Already Paid:</span>{" "}
                  {formatCurrency(selectedWorker.totalPaid)}
                </div>
                <div>
                  <span className="font-medium">Remaining:</span>{" "}
                  {formatCurrency(selectedWorker.remainingAmount)}
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentAmount">Amount (₹) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  max={selectedWorker?.remainingAmount || 0}
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      amount: e.target.value,
                    })
                  }
                  placeholder="Payment amount"
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentMode">Payment Mode *</Label>
                <Select
                  value={paymentFormData.paymentMode}
                  onValueChange={(value) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      paymentMode: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentFormData.paymentDate}
                onChange={(e) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    paymentDate: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={paymentFormData.referenceNumber}
                onChange={(e) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    referenceNumber: e.target.value,
                  })
                }
                placeholder="Transaction reference number"
              />
            </div>

            <div>
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={paymentFormData.notes}
                onChange={(e) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    notes: e.target.value,
                  })
                }
                placeholder="Payment notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
