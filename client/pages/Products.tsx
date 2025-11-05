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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Filter,
  RefreshCw,
} from "lucide-react";
import { productAPI } from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  category: string;
  unitType: string;
  buyPrice?: number;
  sellPrice?: number;
  stockQty?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  name: string;
  category: string;
  unitType: string;
  buyPrice: string;
  sellPrice: string;
  stockQty: string;
  imageUrl: string;
}

const initialFormData: ProductFormData = {
  name: "",
  category: "",
  unitType: "pcs",
  buyPrice: "",
  sellPrice: "",
  stockQty: "0",
  imageUrl: "",
};

const unitTypes = [
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
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        category: selectedCategory === "all" ? "" : selectedCategory,
      };

      const response = await productAPI.getAll(params);
      setProducts(response.data.products || []);
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      );
    } catch (error: any) {
      console.error("Fetch products error:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, searchTerm, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!formData.category.trim()) {
      toast.error("Category is required");
      return;
    }

    if (!formData.buyPrice || parseFloat(formData.buyPrice) < 0) {
      toast.error("Buy price must be a valid number >= 0");
      return;
    }

    if (!formData.sellPrice || parseFloat(formData.sellPrice) < 0) {
      toast.error("Sell price must be a valid number >= 0");
      return;
    }

    if (!formData.stockQty || parseInt(formData.stockQty) < 0) {
      toast.error("Stock quantity must be a valid number >= 0");
      return;
    }

    const productData: any = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      unitType: formData.unitType,
      buyPrice: parseFloat(formData.buyPrice),
      sellPrice: parseFloat(formData.sellPrice),
      stockQty: parseInt(formData.stockQty),
    };

    // Only include imageUrl if it has a value
    if (formData.imageUrl && formData.imageUrl.trim()) {
      productData.imageUrl = formData.imageUrl.trim();
    }

    console.log("Sending product data:", productData);

    try {
      if (editingProduct) {
        await productAPI.update(editingProduct._id, productData);
        toast.success("Product updated successfully");
      } else {
        await productAPI.create(productData);
        toast.success("Product created successfully");
      }

      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingProduct(null);
      fetchProducts();
      fetchCategories();
    } catch (error: any) {
      console.error("Save product error:", error);
      console.error("Error response:", error.response?.data);
      if (error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.error || "Invalid data provided";
        toast.error(`Validation error: ${errorMessage}`);
      } else {
        toast.error(error.response?.data?.error || "Failed to save product");
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      category: product.category || "",
      unitType: product.unitType || "pcs",
      buyPrice: (product.buyPrice ?? 0).toString(),
      sellPrice: (product.sellPrice ?? 0).toString(),
      stockQty: (product.stockQty ?? 0).toString(),
      imageUrl: product.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await productAPI.delete(id);
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error: any) {
      console.error("Delete product error:", error);
      toast.error(error.response?.data?.error || "Failed to delete product");
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingProduct(null);
  };

  const getStockBadgeVariant = (stockQty: number) => {
    if (stockQty === 0) return "destructive";
    if (stockQty < 10) return "secondary";
    return "default";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your inventory and pricing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the product information below."
                  : "Enter the details for the new product."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="unitType">Unit Type</Label>
                    <Select
                      value={formData.unitType}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, unitType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitTypes.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="buyPrice">Buy Price (₹)</Label>
                    <Input
                      id="buyPrice"
                      type="number"
                      step="0.01"
                      value={formData.buyPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, buyPrice: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellPrice">Sell Price (₹)</Label>
                    <Input
                      id="sellPrice"
                      type="number"
                      step="0.01"
                      value={formData.sellPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, sellPrice: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="stockQty">Initial Stock Quantity</Label>
                  <Input
                    id="stockQty"
                    type="number"
                    value={formData.stockQty}
                    onChange={(e) =>
                      setFormData({ ...formData, stockQty: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update Product" : "Add Product"}
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
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
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
            <Button variant="outline" onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products ({pagination.total})
          </CardTitle>
          <CardDescription>
            Manage your product inventory and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCategory
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by adding your first product."}
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Buy Price</TableHead>
                    <TableHead>Sell Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="capitalize">
                        {product.unitType}
                      </TableCell>
                      <TableCell>
                        ₹{(product.buyPrice ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ₹{(product.sellPrice ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStockBadgeVariant(product.stockQty ?? 0)}
                        >
                          {product.stockQty ?? 0} {product.unitType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Product
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product._id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                    of {pagination.total} products
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
    </div>
  );
}
