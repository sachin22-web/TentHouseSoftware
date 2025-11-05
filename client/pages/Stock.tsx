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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  RefreshCw,
  Warehouse,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  History,
  AlertCircle,
} from "lucide-react";
import { stockAPI, productAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Product {
  _id: string;
  name: string;
  category: string;
  unitType: string;
  stockQty: number;
}

interface StockLedgerEntry {
  _id: string;
  productId: Product;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
  referenceId?: string;
  referenceType?: "invoice" | "manual" | "return";
  balanceAfter: number;
  date: string;
  createdAt: string;
}

interface IssueRegisterEntry {
  _id: string;
  productId: Product;
  issueType: "damage" | "lost" | "expired" | "other";
  quantity: number;
  description: string;
  reportedBy: string;
  date: string;
  createdAt: string;
}

interface StockUpdateFormData {
  productId: string;
  type: "in" | "out" | "adjustment";
  quantity: string;
  reason: string;
}

const initialStockFormData: StockUpdateFormData = {
  productId: "",
  type: "in",
  quantity: "",
  reason: "",
};

export default function Stock() {
  const [currentStock, setCurrentStock] = useState<Product[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);
  const [issueRegister, setIssueRegister] = useState<IssueRegisterEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] =
    useState<StockUpdateFormData>(initialStockFormData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("current");
  const [categories, setCategories] = useState<string[]>([]);

  const fetchCurrentStock = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        category: categoryFilter === "all" ? "" : categoryFilter,
        stockLevel: stockFilter === "all" ? "" : stockFilter,
      };

      const response = await stockAPI.getCurrent(params);
      setCurrentStock(response.data.products || []);
    } catch (error: any) {
      console.error("Fetch current stock error:", error);
      toast.error("Failed to load current stock");
    } finally {
      setLoading(false);
    }
  };

  const fetchStockLedger = async () => {
    try {
      const response = await stockAPI.getLedger({ limit: 50 });
      setStockLedger(response.data.ledger || []);
    } catch (error: any) {
      console.error("Fetch stock ledger error:", error);
      toast.error("Failed to load stock ledger");
    }
  };

  const fetchIssueRegister = async () => {
    try {
      const response = await stockAPI.getIssueRegister({ limit: 50 });
      setIssueRegister(response.data.issues || []);
    } catch (error: any) {
      console.error("Fetch issue register error:", error);
      toast.error("Failed to load issue register");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll({ limit: 1000 });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Fetch products error:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  useEffect(() => {
    fetchCurrentStock();
  }, [searchTerm, categoryFilter, stockFilter]);

  // Refresh stock when other pages signal updates (e.g., Event Return)
  useEffect(() => {
    const onCustom = () => fetchCurrentStock();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "stockRefreshTs") fetchCurrentStock();
    };
    const onFocus = () => fetchCurrentStock();
    window.addEventListener("stock:refresh" as any, onCustom);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("stock:refresh" as any, onCustom);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "ledger") {
      fetchStockLedger();
    } else if (activeTab === "issues") {
      fetchIssueRegister();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error("Please select a product");
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for stock update");
      return;
    }

    const updateData = {
      productId: formData.productId,
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      reason: formData.reason.trim(),
    };

    try {
      await stockAPI.updateStock(updateData);
      toast.success("Stock updated successfully");

      setIsDialogOpen(false);
      setFormData(initialStockFormData);
      fetchCurrentStock();
      if (activeTab === "ledger") {
        fetchStockLedger();
      }
    } catch (error: any) {
      console.error("Update stock error:", error);
      if (
        error.response?.status === 400 &&
        error.response?.data?.error?.includes("insufficient stock")
      ) {
        toast.error("Insufficient stock for this operation");
      } else {
        toast.error(error.response?.data?.error || "Failed to update stock");
      }
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setFormData(initialStockFormData);
  };

  const getStockStatusBadge = (stockQty: number) => {
    if (stockQty === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stockQty < 10) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else if (stockQty < 50) {
      return <Badge variant="outline">Medium Stock</Badge>;
    } else {
      return <Badge variant="default">Good Stock</Badge>;
    }
  };

  const getLedgerIcon = (type: string) => {
    switch (type) {
      case "in":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "out":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "adjustment":
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getLedgerColor = (type: string) => {
    switch (type) {
      case "in":
        return "text-green-600";
      case "out":
        return "text-red-600";
      case "adjustment":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600">
            Monitor inventory, stock movements, and issues
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Update Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Update Stock</DialogTitle>
              <DialogDescription>
                Add, remove, or adjust stock quantity for a product.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleStockUpdate}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="productId">Product *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, productId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - Current: {product.stockQty}{" "}
                          {product.unitType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Operation *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "in" | "out" | "adjustment") =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span>Stock In</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="out">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span>Stock Out</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="adjustment">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            <span>Adjustment</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="Enter quantity"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="Enter reason for stock update"
                    required
                  />
                </div>

                {/* Show current stock info */}
                {formData.productId && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    {(() => {
                      const product = products.find(
                        (p) => p._id === formData.productId,
                      );
                      if (!product) return null;

                      const qty = parseFloat(formData.quantity) || 0;
                      let newStock = product.stockQty;

                      if (formData.type === "in") {
                        newStock += qty;
                      } else if (formData.type === "out") {
                        newStock -= qty;
                      } else if (formData.type === "adjustment") {
                        newStock = qty;
                      }

                      return (
                        <div className="text-sm">
                          <p>
                            <strong>{product.name}</strong>
                          </p>
                          <p>
                            Current Stock: {product.stockQty} {product.unitType}
                          </p>
                          <p
                            className={
                              newStock < 0 ? "text-red-600 font-medium" : ""
                            }
                          >
                            New Stock: {newStock} {product.unitType}
                            {newStock < 0 && " (Insufficient stock!)"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button type="submit">Update Stock</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Stock</TabsTrigger>
          <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
          <TabsTrigger value="issues">Issue Register</TabsTrigger>
        </TabsList>

        {/* Current Stock Tab */}
        <TabsContent value="current" className="space-y-4">
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
                      placeholder="Search products..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by stock level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                    <SelectItem value="low">Low Stock (&lt;10)</SelectItem>
                    <SelectItem value="medium">Medium Stock (10-50)</SelectItem>
                    <SelectItem value="good">Good Stock (&gt;50)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={fetchCurrentStock}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Stock Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Current Stock ({currentStock.length})
              </CardTitle>
              <CardDescription>
                Current inventory levels for all products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : currentStock.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No products found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ||
                    categoryFilter !== "all" ||
                    stockFilter !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "No products available in stock."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit Type</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStock.map((product) => (
                      <TableRow key={product._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="capitalize">
                          <Select
                            value={product.unitType}
                            onValueChange={async (val) => {
                              try {
                                // Fetch full product to satisfy strict validators if present
                                const d = await productAPI.getById(product._id);
                                const p = d.data || {};
                                await productAPI.update(product._id, {
                                  name: p.name ?? product.name,
                                  category: p.category ?? product.category,
                                  unitType: val,
                                  buyPrice: p.buyPrice ?? 0,
                                  sellPrice: p.sellPrice ?? 0,
                                  stockQty: p.stockQty ?? product.stockQty ?? 0,
                                  imageUrl: p.imageUrl ?? undefined,
                                });
                                toast.success("Unit updated");
                                fetchCurrentStock();
                              } catch (e: any) {
                                console.error(e);
                                toast.error(
                                  e?.response?.data?.error ||
                                    "Failed to update unit",
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                { value: "pcs", label: "Pieces" },
                                { value: "no", label: "No." },
                                { value: "nos", label: "Nos." },
                                { value: "unit", label: "Unit" },
                                { value: "units", label: "Units" },
                                { value: "pair", label: "Pair" },
                                { value: "set", label: "Set" },
                                { value: "meter", label: "Meter" },
                                { value: "sqft", label: "Square Feet" },
                                { value: "sqyd", label: "Square Yard" },
                                { value: "sqmt", label: "Square Meter" },
                                { value: "kg", label: "Kilogram" },
                                { value: "g", label: "Gram" },
                                { value: "litre", label: "Litre" },
                                { value: "ml", label: "Millilitre" },
                                { value: "box", label: "Box" },
                                { value: "roll", label: "Roll" },
                                { value: "bundle", label: "Bundle" },
                              ].map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              product.stockQty === 0
                                ? "text-red-600 font-medium"
                                : "font-medium"
                            }
                          >
                            {product.stockQty} {product.unitType}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStockStatusBadge(product.stockQty)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Stock Ledger
              </CardTitle>
              <CardDescription>
                Complete history of all stock movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockLedger.length === 0 ? (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No stock movements found
                  </h3>
                  <p className="text-gray-500">
                    No stock transactions have been recorded yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockLedger.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {entry.productId?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.productId?.category}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              "flex items-center gap-2",
                              getLedgerColor(entry.type),
                            )}
                          >
                            {getLedgerIcon(entry.type)}
                            <span className="capitalize font-medium">
                              {entry.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              entry.type === "in"
                                ? "text-green-600"
                                : entry.type === "out"
                                  ? "text-red-600"
                                  : "text-blue-600",
                            )}
                          >
                            {entry.type === "out" ? "-" : "+"}
                            {entry.quantity} {entry.productId?.unitType}
                          </span>
                        </TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {entry.balanceAfter} {entry.productId?.unitType}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issue Register Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Issue Register
              </CardTitle>
              <CardDescription>
                Record of damaged, lost, or problematic stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issueRegister.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No issues reported
                  </h3>
                  <p className="text-gray-500">
                    No stock issues have been reported yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reported By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueRegister.map((issue) => (
                      <TableRow key={issue._id}>
                        <TableCell>
                          {new Date(issue.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {issue.productId?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {issue.productId?.category}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {issue.issueType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">
                            {issue.quantity} {issue.productId?.unitType}
                          </span>
                        </TableCell>
                        <TableCell>{issue.description}</TableCell>
                        <TableCell>{issue.reportedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
