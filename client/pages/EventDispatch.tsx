import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { eventAPI, productAPI, api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function EventDispatch() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [ev, prods] = await Promise.all([
          eventAPI.getById(id!),
          productAPI.getAll({ limit: 1000 }),
        ]);
        const eventData = ev.data;
        setEvent(eventData);
        const items = prods.data?.products || [];

        // Prefill from last reserved draft (if any)
        const drafts = Array.isArray(eventData?.dispatchDrafts)
          ? eventData.dispatchDrafts
          : [];
        const lastDraft = drafts.length ? drafts[drafts.length - 1] : null;
        const prefillMap: Record<string, { qty: number; rate: number }> = {};
        if (lastDraft?.items?.length) {
          for (const it of lastDraft.items) {
            const pid = String(it.productId || it.itemId || "");
            if (!pid) continue;
            const qty = Number(it.qtyToSend ?? it.qty ?? 0) || 0;
            const rate = Number(it.rate || 0) || 0;
            prefillMap[pid] = { qty, rate };
          }
        }

        setRows(
          items.map((p: any) => {
            const preset = prefillMap[String(p._id)] || {
              qty: 0,
              rate: p.sellPrice || 0,
            };
            const qty = Number(preset.qty || 0);
            const rate = Number((preset.rate ?? p.sellPrice) || 0);
            return {
              ...p,
              qty,
              rate,
              amount: Number((qty * rate).toFixed(2)),
            };
          }),
        );
      } catch (e) {
        console.error(e);
        toast.error("Failed to load dispatch data");
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.qty * r.rate || 0), 0),
    [rows],
  );
  const formatINR = (n: number) => `₹${n.toFixed(2)}`;

  const updateRow = (i: number, patch: any) => {
    setRows((prev) => {
      const next = [...prev];
      const r = { ...next[i], ...patch };
      if (r.qty < 0) r.qty = 0;
      r.amount = Number((r.qty * r.rate).toFixed(2));
      next[i] = r;
      return next;
    });
  };

  const submit = async () => {
    try {
      const items = rows
        .filter((r) => r.qty > 0)
        .map((r) => ({
          productId: r._id,
          name: r.name,
          sku: r.sku,
          unitType: r.unitType,
          stockQty: r.stockQty,
          qty: r.qty,
          rate: r.rate,
        }));

      if (!items.length) {
        toast.error("Select at least one item with quantity > 0");
        return;
      }

      await eventAPI.dispatch(id!, { items });
      toast.success("Dispatch recorded");
      window.location.href = `/admin/events/${id}/agreement`;
    } catch (e: any) {
      console.error(e);
      const data = e?.response?.data || {};
      if (data?.error === "Stock Required") {
        const name = data?.productName || "item";
        const shortage = Number(data?.shortage || 0);
        toast.error(
          `Stock required: ${name}${shortage ? ` (shortage ${shortage})` : ""}`,
        );
      } else {
        toast.error(data?.error || "Failed to dispatch");
      }
    }
  };

  const reserve = async () => {
    try {
      const items = rows
        .filter((r) => r.qty > 0)
        .map((r) => ({
          productId: r._id,
          name: r.name,
          sku: r.sku,
          unitType: r.unitType,
          stockQty: r.stockQty,
          qty: r.qty,
          rate: r.rate,
        }));

      if (!items.length) {
        toast.error("Select at least one item with quantity > 0");
        return;
      }

      await api.post(`/events/${id}/dispatch?dryRun=1`, { items });
      toast.success("Reserved");
      window.location.href = `/admin/events/${id}/agreement`;
    } catch (e: any) {
      console.error(e);
      const data = e?.response?.data || {};
      if (data?.error === "Stock Required") {
        const name = data?.productName || "item";
        const shortage = Number(data?.shortage || 0);
        toast.error(
          `Stock required: ${name}${shortage ? ` (shortage ${shortage})` : ""}`,
        );
      } else {
        toast.error(data?.error || "Failed to reserve");
      }
    }
  };

  if (loading || !event)
    return (
      <div className="p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Stock Out (Dispatch)</h1>
          {event.status === "reserved" && (
            <Badge variant="secondary" className="text-xs">
              Reserved
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Advance: {formatINR(event.advance || 0)}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r._id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.sku || "-"}</TableCell>
                  <TableCell>{r.unitType}</TableCell>
                  <TableCell>
                    {typeof r.stockQty === "number"
                      ? `${r.stockQty} ${r.unitType || ""}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateRow(i, { qty: Math.max(0, r.qty - 1) })
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        className="w-20"
                        value={r.qty}
                        onChange={(e) =>
                          updateRow(i, { qty: Number(e.target.value) })
                        }
                      />
                      <span className="text-xs text-muted-foreground min-w-[2.5rem] text-center">
                        {r.unitType}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateRow(i, { qty: r.qty + 1 })}
                      >
                        +
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-24"
                        value={r.rate}
                        onChange={(e) =>
                          updateRow(i, { rate: Number(e.target.value) })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        / {r.unitType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatINR(r.amount || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4 text-lg font-semibold">
            Total: {formatINR(total)}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button variant="ghost" onClick={reserve}>
          Reserve & Proceed
        </Button>
        <Button onClick={submit}>Confirm Dispatch</Button>
      </div>
    </div>
  );
}
