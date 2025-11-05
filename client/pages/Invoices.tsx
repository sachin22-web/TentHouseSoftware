import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Receipt,
  Filter,
  RefreshCw,
  Download,
  RotateCcw,
  Eye,
  FileText,
  Calculator,
} from "lucide-react";
import {
  invoiceAPI,
  clientAPI,
  productAPI,
  eventAPI,
  paymentsAPI,
} from "@/lib/api";
import { useLocation } from "react-router-dom";

interface Client {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  gstNumber?: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  unitType: string;
  sellPrice: number;
  stockQty: number;
}

interface InvoiceItem {
  productId: string;
  desc?: string;
  unitType: string;
  qty: number;
  rate: number;
  taxPct?: number;
  isAdjustment?: boolean;
}

interface Invoice {
  _id: string;
  number: string;
  clientId: Client;
  eventId?: string;
  date: string;
  withGST: boolean;
  language: "en" | "hi";
  items: InvoiceItem[];
  totals?: {
    subTotal: number;
    tax: number;
    discount?: number;
    roundOff?: number;
    grandTotal: number;
    paid: number;
    pending: number;
  };
  status: "draft" | "final" | "returned";
  createdAt: string;
}

interface InvoiceFormData {
  clientId: string;
  withGST: boolean;
  language: "en" | "hi";
  items: InvoiceItem[];
  paid: number;
  discount: number;
}

const initialFormData: InvoiceFormData = {
  clientId: "",
  withGST: false,
  language: "en",
  items: [],
  paid: 0,
  discount: 0,
};

const initialItem: InvoiceItem = {
  productId: "",
  desc: "",
  unitType: "pcs",
  qty: 1,
  rate: 0,
  taxPct: 0,
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<InvoiceFormData>(initialFormData);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prefillClientLocked, setPrefillClientLocked] = useState(false);
  const [prefillEventId, setPrefillEventId] = useState<string | null>(null);
  const [returnDues, setReturnDues] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Payment modal state
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [payMode, setPayMode] = useState<"cash" | "upi" | "card" | "bank">(
    "cash",
  );
  const [payRef, setPayRef] = useState<string>("");
  const [payLoading, setPayLoading] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter === "all" ? "" : statusFilter,
      };

      const response = await invoiceAPI.getAll(params);
      setInvoices(response.data.invoices || []);
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      );
    } catch (error: any) {
      console.error("Fetch invoices error:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientAPI.getAll();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error("Fetch clients error:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Fetch products error:", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  // Auto-open invoice creation when a recent return due exists (<= 2h)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastReturnDue");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data?.eventId || !data?.clientId) return;
      const ageMs = Date.now() - Number(data.ts || 0);
      const within2h = ageMs >= 0 && ageMs <= 2 * 60 * 60 * 1000;

      (async () => {
        try {
          const evRes = await eventAPI.getById(data.eventId);
          const ev = evRes.data;
          const lastDispatch =
            ev.dispatches && ev.dispatches.length
              ? ev.dispatches[ev.dispatches.length - 1]
              : null;
          const base =
            (lastDispatch && lastDispatch.items) || ev.selections || [];
          const baseItems = base.map(
            (it: any) =>
              ({
                productId: String(it.productId || it._id || ""),
                desc: it.name || "",
                unitType: it.unitType || "pcs",
                qty: Number(it.qtyToSend || it.qty || 0),
                rate: Number(it.rate || 0),
                taxPct: 0,
              }) as InvoiceItem,
          );

          setFormData({
            clientId: ev.clientId?._id || ev.clientId || data.clientId,
            withGST: false,
            language: "en",
            items: baseItems,
            paid: 0,
            discount: 0,
          });
          setPrefillClientLocked(true);
          setPrefillEventId(String(data.eventId));

          if (within2h) {
            setReturnDues(Number(Number(data.amount || 0).toFixed(2)) || 0);
          } else {
            try {
              const s = await eventAPI.getLastReturnSummary(
                String(data.eventId),
              );
              const amt = Number(
                s?.data?.lastReturnSummary?.totals?.returnDue ?? 0,
              );
              setReturnDues(Number(amt.toFixed(2)) || 0);
            } catch (e) {
              /* ignore */
            }
          }
          setIsDialogOpen(true);
        } catch (e) {
          console.error("Failed to prefill from lastReturnDue", e);
        }
      })();
    } catch (_) {}
  }, [products.length]);

  // Auto-open invoice modal when redirected from return flow
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldNew = params.get("new");
    const eventId = params.get("eventId");
    if (shouldNew === "1" && eventId) {
      (async () => {
        try {
          // fetch event and products if needed
          const evRes = await eventAPI.getById(eventId);
          const ev = evRes.data;

          // base lines = last confirmed dispatch
          const lastDispatch =
            ev.dispatches && ev.dispatches.length
              ? ev.dispatches[ev.dispatches.length - 1]
              : null;
          const base =
            (lastDispatch && lastDispatch.items) || ev.selections || [];
          const baseItems = base.map(
            (it: any) =>
              ({
                productId: String(it.productId || it._id || ""),
                desc: it.name || "",
                unitType: it.unitType || "pcs",
                qty: Number(it.qtyToSend || it.qty || 0),
                rate: Number(it.rate || 0),
                taxPct: 0,
              }) as InvoiceItem,
          );

          // adjustments from last return
          const lastReturn =
            ev.returns && ev.returns.length
              ? ev.returns[ev.returns.length - 1]
              : null;
          let damageSum = 0;
          let shortageSum = 0;
          let lateSum = 0;
          if (lastReturn && Array.isArray(lastReturn.items)) {
            lastReturn.items.forEach((r: any) => {
              damageSum += Number(r.damageAmount || 0);
              shortageSum += Number(r.shortageCost || 0);
              lateSum += Number(r.lateFee || 0);
            });
          }

          const fallbackPid = baseItems[0]?.productId || products[0]?._id || "";
          const adjustItems: InvoiceItem[] = [];

          // Create per-item shortage and damage adjustment lines
          if (lastReturn && Array.isArray(lastReturn.items)) {
            lastReturn.items.forEach((r: any) => {
              const itemName = r.name || r.desc || "Item";
              const shortageCost = Number(r.shortageCost || 0);
              const damageAmount = Number(r.damageAmount || 0);

              if (shortageCost > 0) {
                adjustItems.push({
                  productId: fallbackPid,
                  desc: `Shortage – ${itemName}`,
                  unitType: "pcs",
                  qty: 1,
                  rate: Number(shortageCost.toFixed(2)),
                  taxPct: 0,
                  isAdjustment: true,
                });
              }

              if (damageAmount > 0) {
                adjustItems.push({
                  productId: fallbackPid,
                  desc: `Damage – ${itemName}`,
                  unitType: "pcs",
                  qty: 1,
                  rate: Number(damageAmount.toFixed(2)),
                  taxPct: 0,
                  isAdjustment: true,
                });
              }
            });
          }

          // Single aggregated Late Fee line if any
          if (lateSum > 0) {
            adjustItems.push({
              productId: fallbackPid,
              desc: "Late Fee",
              unitType: "pcs",
              qty: 1,
              rate: Number(lateSum.toFixed(2)),
              taxPct: 0,
              isAdjustment: true,
            });
          }

          // prefill form
          setFormData({
            clientId: ev.clientId?._id || ev.clientId || "",
            withGST: false,
            language: "en",
            items: [...baseItems, ...adjustItems],
            paid: Number(ev.advance || 0),
            discount: 0,
          });
          setPrefillClientLocked(true);
          setPrefillEventId(eventId);
          setIsDialogOpen(true);
        } catch (e) {
          console.error("Prefill invoice from event failed", e);
        }
      })();
    }
  }, [location.search, products]);

  const calculateTotals = (
    items: InvoiceItem[],
    discount: number = 0,
    withGST: boolean = false,
    extraCharge: number = 0,
  ) => {
    const subTotal = items.reduce(
      (total, item) => total + item.qty * item.rate,
      0,
    );
    const discountAmount = (subTotal * discount) / 100;
    const discountedSubTotal = subTotal - discountAmount;

    let tax = 0;
    if (withGST) {
      tax = items.reduce((total, item) => {
        const itemTotal = item.qty * item.rate;
        const itemTax = (itemTotal * (item.taxPct || 18)) / 100;
        return total + itemTax;
      }, 0);
    }

    const grandTotalRaw = discountedSubTotal + tax + (extraCharge || 0);
    const roundOff = Math.round(grandTotalRaw) - grandTotalRaw;
    const finalTotal = Math.round(grandTotalRaw);

    return {
      subTotal,
      tax,
      discount: discountAmount,
      roundOff,
      grandTotal: finalTotal,
    };
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...initialItem }],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];

    if (field === "productId" && value) {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productId: value,
          desc: product.name || "",
          unitType: product.unitType || "pcs",
          rate: product.sellPrice || 0,
          taxPct: formData.withGST ? 18 : 0,
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (
    e: React.FormEvent,
    finalize: boolean = false,
  ) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast.error("Please select a client");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Build items payload, appending Return Dues as a line if applicable
    const itemsForPayload = formData.items.map((it) => ({ ...it }));
    if (returnDues > 0) {
      const fallbackPid =
        itemsForPayload[0]?.productId || products[0]?._id || "";
      itemsForPayload.push({
        productId: String(fallbackPid),
        desc: "Return Dues",
        unitType: "pcs",
        qty: 1,
        rate: Number(returnDues.toFixed(2)),
        taxPct: 0,
        isAdjustment: true,
      });
    }

    const totals = calculateTotals(
      itemsForPayload,
      formData.discount,
      formData.withGST,
      0,
    );
    const pending = totals.grandTotal - formData.paid;

    const invoiceData: any = {
      clientId: formData.clientId,
      withGST: formData.withGST,
      language: formData.language,
      items: itemsForPayload,
      totals: {
        ...totals,
        paid: formData.paid,
        pending,
      },
      status: finalize ? "final" : "draft",
    };

    if (prefillEventId) invoiceData.eventId = prefillEventId;

    try {
      if (editingInvoice) {
        await invoiceAPI.update(editingInvoice._id, invoiceData);
        toast.success(
          `Invoice ${finalize ? "finalized" : "updated"} successfully`,
        );
      } else {
        await invoiceAPI.create(invoiceData);
        toast.success(
          `Invoice ${finalize ? "created and finalized" : "saved as draft"} successfully`,
        );
      }

      if (finalize) {
        try {
          localStorage.removeItem("lastReturnDue");
        } catch (_) {}
      }

      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingInvoice(null);
      setReturnDues(0);
      fetchInvoices();
    } catch (error: any) {
      console.error("Save invoice error:", error);
      toast.error(error.response?.data?.error || "Failed to save invoice");
    }
  };

  const handleEdit = (invoice: Invoice) => {
    if (invoice.status === "final") {
      toast.error("Cannot edit finalized invoices");
      return;
    }

    setEditingInvoice(invoice);
    setFormData({
      clientId: invoice.clientId?._id || "",
      withGST: invoice.withGST || false,
      language: invoice.language || "en",
      items: invoice.items || [],
      paid: invoice.totals?.paid || 0,
      discount:
        invoice.totals?.discount && invoice.totals?.subTotal
          ? ((invoice.totals.discount || 0) / invoice.totals.subTotal) * 100
          : 0,
    });
    setReturnDues(0);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await invoiceAPI.delete(id);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error: any) {
      console.error("Delete invoice error:", error);
      toast.error(error.response?.data?.error || "Failed to delete invoice");
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await invoiceAPI.return(id);
      toast.success("Invoice returned successfully");
      fetchInvoices();
    } catch (error: any) {
      console.error("Return invoice error:", error);
      toast.error(error.response?.data?.error || "Failed to return invoice");
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const response = await invoiceAPI.downloadPDF(
        invoice._id,
        invoice.language,
        invoice.withGST,
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      console.error("Download PDF error:", error);
      toast.error("Failed to download PDF");
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingInvoice(null);
    try {
      localStorage.removeItem("lastReturnDue");
    } catch (_) {}
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "final":
        return "default";
      case "returned":
        return "destructive";
      default:
        return "default";
    }
  };

  const openSettle = (inv: Invoice) => {
    setPayInvoice(inv);
    const pending = Number(inv.totals?.pending ?? 0);
    setPayAmount(Number(pending.toFixed(2)));
    setPayDate(new Date().toISOString().slice(0, 16));
    setPayMode("cash");
    setPayRef("");
    setIsPayOpen(true);
  };

  const recordPayment = async () => {
    if (!payInvoice) return;
    try {
      setPayLoading(true);
      setInvoices((prev) =>
        prev.map((x) => {
          if (x._id !== payInvoice._id) return x;
          const paid = Number(x.totals?.paid ?? 0) + Number(payAmount || 0);
          const grand = Number(x.totals?.grandTotal ?? 0);
          const newPaid = Math.min(grand, Number(paid.toFixed(2)));
          const newPending = Math.max(0, Number((grand - newPaid).toFixed(2)));
          return {
            ...x,
            totals: {
              ...(x.totals as any),
              paid: newPaid,
              pending: newPending,
            },
          } as Invoice;
        }),
      );

      await paymentsAPI.create({
        invoiceId: payInvoice._id,
        eventId: (payInvoice as any).eventId,
        clientId: payInvoice.clientId?._id,
        amount: Number(payAmount),
        mode: payMode,
        ref: payRef || undefined,
        at: new Date(payDate).toISOString(),
      });

      // notify other pages (event details) to refetch financials
      try {
        window.dispatchEvent(
          new CustomEvent("payments:updated", {
            detail: {
              eventId: (payInvoice as any).eventId,
              invoiceId: payInvoice._id,
            },
          }),
        );
      } catch {}

      setIsPayOpen(false);
      setPayInvoice(null);
      toast.success("Payment recorded");
      fetchInvoices();
    } catch (e: any) {
      await fetchInvoices();
      toast.error(e?.response?.data?.error || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  const totals = calculateTotals(
    formData.items,
    formData.discount,
    formData.withGST,
    returnDues,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">
            Create and manage invoices with GST support
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice
                  ? "Update the invoice information below."
                  : "Create a new invoice for your client."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="grid gap-6 py-4">
                {/* Header Section */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="clientId">Client</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, clientId: value })
                      }
                      disabled={prefillClientLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name} - {client.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value: "en" | "hi") =>
                        setFormData({ ...formData, language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="withGST"
                      checked={formData.withGST}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          withGST: checked,
                          items: formData.items.map((item) => ({
                            ...item,
                            taxPct: checked ? item.taxPct || 18 : 0,
                          })),
                        });
                      }}
                    />
                    <Label htmlFor="withGST">Include GST</Label>
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">
                      Invoice Items
                    </Label>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          {formData.withGST && <TableHead>Tax %</TableHead>}
                          <TableHead>Amount</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={item.productId}
                                onValueChange={(value) =>
                                  updateItem(index, "productId", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem
                                      key={product._id}
                                      value={product._id}
                                    >
                                      {product.name} ({product.stockQty}{" "}
                                      {product.unitType})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.desc || ""}
                                onChange={(e) =>
                                  updateItem(index, "desc", e.target.value)
                                }
                                placeholder="Description"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.qty}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "qty",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                step="0.01"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.rate}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "rate",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                step="0.01"
                              />
                            </TableCell>
                            {formData.withGST && (
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.taxPct || 0}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "taxPct",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  min="0"
                                  max="100"
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              ₹{(item.qty * item.rate).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="discount">Discount (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paid">Amount Paid</Label>
                      <Input
                        id="paid"
                        type="number"
                        value={formData.paid}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paid: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="returnDues">Return Dues (₹)</Label>
                      <Input
                        id="returnDues"
                        type="number"
                        value={returnDues}
                        onChange={(e) =>
                          setReturnDues(
                            Number(Number(e.target.value || 0).toFixed(2)) || 0,
                          )
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{totals.subTotal.toFixed(2)}</span>
                    </div>
                    {formData.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({formData.discount}%):</span>
                        <span>-₹{totals.discount?.toFixed(2)}</span>
                      </div>
                    )}
                    {formData.withGST && (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>₹{totals.tax.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.roundOff !== 0 && (
                      <div className="flex justify-between">
                        <span>Round Off:</span>
                        <span>₹{totals.roundOff?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Grand Total:</span>
                      <span>₹{totals.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>₹{formData.paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Pending:</span>
                      <span>
                        ₹{(totals.grandTotal - formData.paid).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button type="submit" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button type="button" onClick={(e) => handleSubmit(e, true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  {editingInvoice ? "Update & Finalize" : "Create & Finalize"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchInvoices}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices ({pagination.total})
          </CardTitle>
          <CardDescription>Manage your invoices and billing</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No invoices found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first invoice."}
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell>
                        <div className="font-medium">{invoice.number}</div>
                        <div className="text-sm text-gray-500">
                          {invoice.withGST ? "With GST" : "No GST"} •{" "}
                          {invoice.language.toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {invoice.clientId?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.clientId?.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        ₹{(invoice.totals?.grandTotal ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ₹{(invoice.totals?.paid ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            (invoice.totals?.pending ?? 0) > 0
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          ₹{(invoice.totals?.pending ?? 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(invoice.totals?.pending ?? 0) === 0 ? (
                          <Badge variant="success">Paid</Badge>
                        ) : (
                          <Badge
                            variant={getStatusBadgeVariant(invoice.status)}
                          >
                            {invoice.status.charAt(0).toUpperCase() +
                              invoice.status.slice(1)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {invoice.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(invoice)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {invoice.status === "final" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReturn(invoice._id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}

                          {invoice.status === "draft" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Invoice
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete invoice "
                                    {invoice.number}"? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(invoice._id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {(invoice.totals?.pending ?? 0) > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSettle(invoice)}
                            >
                              ₹ Settle
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{" "}
                    of {pagination.total} invoices
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          page: pagination.page - 1,
                        })
                      }
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          page: pagination.page + 1,
                        })
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Settle dues for invoice {payInvoice?.number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) =>
                  setPayAmount(Number(Number(e.target.value || 0).toFixed(2)))
                }
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label>Payment Date & Time</Label>
              <Input
                type="datetime-local"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={payMode} onValueChange={(v: any) => setPayMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ref (optional)</Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Txn ID / Notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPayOpen(false)}
              disabled={payLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={recordPayment}
              disabled={payLoading || !payInvoice || payAmount <= 0}
            >
              {payLoading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
