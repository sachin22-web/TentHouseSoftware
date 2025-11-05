import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { b2bAPI } from "@/lib/api";
import { toast } from "sonner";

interface B2BItem {
  _id: string;
  itemName: string;
  supplierName: string;
  quantityAvailable: number;
  unitPrice: number;
  productId?:
    | { _id: string; name: string; unitType?: string; stockQty?: number }
    | string
    | null;
  purchaseLogs?: {
    _id?: string;
    quantity: number;
    price: number;
    supplierName: string;
    createdAt: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export default function B2B() {
  const [items, setItems] = useState<B2BItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [name, setName] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [supplier, setSupplier] = useState("");

  // Edit/purchase dialog state
  const [active, setActive] = useState<B2BItem | null>(null);
  const [editQty, setEditQty] = useState<number | "">("");
  const [editPrice, setEditPrice] = useState<number | "">("");
  const [editSupplier, setEditSupplier] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await b2bAPI.list();
      const list: B2BItem[] = res.data?.items || [];
      setItems(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load B2B stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetCreate = () => {
    setName("");
    setQty("");
    setPrice("");
    setSupplier("");
  };

  const onCreate = async () => {
    try {
      if (!name.trim() || !supplier.trim() || !qty || !price) {
        toast.error("All fields are required");
        return;
      }
      await b2bAPI.create({
        itemName: name.trim(),
        quantity: Number(qty),
        price: Number(price),
        supplierName: supplier.trim(),
      });
      toast.success("B2B stock added");
      resetCreate();
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to add");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await b2bAPI.remove(id);
      toast.success("Deleted");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  const openPurchase = (it: B2BItem) => {
    setActive(it);
    setEditQty("");
    setEditPrice("");
    setEditSupplier(it.supplierName || "");
  };

  const onPurchase = async () => {
    try {
      if (!active) return;
      if (!editQty || !editPrice || !editSupplier.trim()) {
        toast.error("Quantity, Price, Supplier required");
        return;
      }
      await b2bAPI.purchase(active._id, {
        quantity: Number(editQty),
        price: Number(editPrice),
        supplierName: editSupplier.trim(),
      });
      toast.success("Purchase logged");
      setActive(null);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Purchase failed");
    }
  };

  const onInlineUpdate = async (
    id: string,
    field: "itemName" | "supplierName" | "unitPrice" | "quantityAvailable",
    value: string | number,
  ) => {
    try {
      const payload: any = {};
      if (field === "unitPrice") payload.price = Number(value);
      else if (field === "quantityAvailable") payload.quantity = Number(value);
      else (payload as any)[field] = value;
      await b2bAPI.update(id, payload);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Update failed");
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">B2B Stock</h1>
        <p className="text-gray-600">Manage stock sourced from other parties</p>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add B2B Item</CardTitle>
          <CardDescription>Record purchases from suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tent Chair"
              />
            </div>
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier Name</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Sharma Traders"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={onCreate}>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current B2B Inventory</CardTitle>
          <CardDescription>Edit, delete, and add purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No B2B items
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Received (Total)</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Qty Available</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Linked Product</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((it) => {
                    const totalReceived = (it.purchaseLogs || []).reduce(
                      (sum, p) => sum + Number(p.quantity || 0),
                      0,
                    );
                    const used = Math.max(0, totalReceived - Number(it.quantityAvailable || 0));
                    return (
                      <TableRow key={it._id}>
                        <TableCell>
                          <Input
                            defaultValue={it.itemName}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== it.itemName) {
                                onInlineUpdate(it._id, "itemName", v);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            defaultValue={it.supplierName}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== it.supplierName) {
                                onInlineUpdate(it._id, "supplierName", v);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{totalReceived}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-orange-600 font-medium">{used}</span>
                        </TableCell>
                        <TableCell className="w-32">
                          <Input
                            type="number"
                            defaultValue={it.quantityAvailable}
                            min={0}
                            onBlur={(e) => {
                              const input = e.target as HTMLInputElement;
                              const raw = input.value;
                              if (raw === "") return;
                              const num = Number(raw);
                              if (!Number.isFinite(num) || num < 0) return;
                              const current = Number(it.quantityAvailable) || 0;
                              if (num === current) return;
                              const delta = num - current;
                              const linked = typeof it.productId === "object" && it.productId ? (it.productId as any) : null;
                              const mainStock = linked && typeof linked.stockQty === "number" ? Number(linked.stockQty) : null;
                              if (delta > 0 && mainStock !== null && mainStock < delta) {
                                toast.error("Insufficient main stock to transfer to B2B");
                                input.value = String(current);
                                return;
                              }
                              onInlineUpdate(it._id, "quantityAvailable", num);
                            }}
                          />
                        </TableCell>
                        <TableCell className="w-32">
                          <Input
                            type="number"
                            defaultValue={it.unitPrice}
                            min={0}
                            onBlur={(e) => {
                              const raw = e.target.value;
                              if (raw === "") return;
                              const num = Number(raw);
                              if (!Number.isFinite(num) || num < 0) return;
                              if (num !== Number(it.unitPrice)) {
                                onInlineUpdate(it._id, "unitPrice", num);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {typeof it.productId === "object" && it.productId ? (
                            <span className="text-sm text-gray-700">
                              {(it.productId as any).name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not linked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPurchase(it)}
                                >
                                  Add Purchase
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Add Purchase - {active?.itemName}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                                  <div>
                                    <Label>Quantity</Label>
                                    <Input
                                      type="number"
                                      value={editQty}
                                      onChange={(e) =>
                                        setEditQty(
                                          e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Price</Label>
                                    <Input
                                      type="number"
                                      value={editPrice}
                                      onChange={(e) =>
                                        setEditPrice(
                                          e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Supplier</Label>
                                    <Input
                                      value={editSupplier}
                                      onChange={(e) =>
                                        setEditSupplier(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button onClick={onPurchase}>Save</Button>
                                </div>
                                {active?.purchaseLogs &&
                                  active.purchaseLogs.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium mb-2">
                                        Purchase Logs
                                      </h4>
                                      <div className="max-h-48 overflow-y-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Date</TableHead>
                                              <TableHead>Qty</TableHead>
                                              <TableHead>Price</TableHead>
                                              <TableHead>Supplier</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {active.purchaseLogs.map((pl) => (
                                              <TableRow
                                                key={pl._id || pl.createdAt}
                                              >
                                                <TableCell>
                                                  {new Date(
                                                    pl.createdAt,
                                                  ).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                  {pl.quantity}
                                                </TableCell>
                                                <TableCell>₹{pl.price}</TableCell>
                                                <TableCell>
                                                  {pl.supplierName}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDelete(it._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
