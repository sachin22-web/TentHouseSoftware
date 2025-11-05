import React, { useEffect, useMemo, useState } from "react";
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
import { eventAPI, invoiceAPI, productAPI } from "@/lib/api";
import { toast } from "sonner";

export default function EventInvoice() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [manualLines, setManualLines] = useState<any[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [includeSecurity, setIncludeSecurity] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [evRes, prodsRes] = await Promise.all([
          eventAPI.getById(id!),
          productAPI.getAll({ limit: 1000 }),
        ]);
        const ev = evRes.data;
        setEvent(ev);
        setProducts(prodsRes.data?.products || []);

        const lastDispatch = ev.dispatches?.[ev.dispatches.length - 1];
        const base =
          (lastDispatch && lastDispatch.items) || ev.selections || [];
        const baseItems = base.map((it: any) => ({
          productId: it.productId,
          desc: it.name || "",
          unitType: it.unitType || "pcs",
          qty: Number(it.qtyToSend || it.qty || 0),
          rate: Number(it.rate || 0),
        }));

        // return adjustments from last return
        const lastReturn = ev.returns?.[ev.returns.length - 1];
        const adjustLines: any[] = [];
        let lateTotal = 0;
        if (lastReturn && Array.isArray(lastReturn.items)) {
          lastReturn.items.forEach((r: any) => {
            const shortage = Number(r.shortage || 0);
            const damage = Number(r.damageAmount || 0);
            const late = Number(r.lateFee || 0);
            const lossPrice = Number(r.lossPrice || r.buyPrice || r.rate || 0);
            const shortageCost = Number((shortage * lossPrice).toFixed(2));

            if (shortage > 0 && shortageCost > 0) {
              adjustLines.push({
                productId: r.productId,
                desc: `Shortage - ${r.name}`,
                unitType: r.unitType || "pcs",
                qty: 1,
                rate: shortageCost,
              });
            }

            if (damage > 0) {
              adjustLines.push({
                productId: r.productId,
                desc: `Damage - ${r.name}`,
                unitType: r.unitType || "pcs",
                qty: 1,
                rate: damage,
              });
            }

            if (late > 0) {
              lateTotal += late;
            }
          });

          if (lateTotal > 0) {
            const fallbackPid =
              baseItems[0]?.productId || (lastReturn.items[0]?.productId ?? "");
            adjustLines.push({
              productId: fallbackPid,
              desc: `Late Fee`,
              unitType: "pcs",
              qty: 1,
              rate: Number(lateTotal.toFixed(2)),
            });
          }
        }

        setItems([...baseItems, ...adjustLines]);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load invoice data");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  // compute totals: base subtotal and adjustments separated
  const baseCount =
    event?.dispatches?.[event.dispatches.length - 1]?.items?.length ||
    event?.selections?.length ||
    0;

  const baseItemsMemo = useMemo(
    () => items.slice(0, baseCount),
    [items, baseCount],
  );
  const adjustItemsMemo = useMemo(
    () => items.slice(baseCount),
    [items, baseCount],
  );

  const baseSubtotal = useMemo(() => {
    const s = (baseItemsMemo || []).reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0),
      0,
    );
    return Number(s.toFixed(2));
  }, [baseItemsMemo]);

  const adjustmentsTotal = useMemo(() => {
    const s = (adjustItemsMemo || []).reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0),
      0,
    );
    return Number(s.toFixed(2));
  }, [adjustItemsMemo]);

  const discountAmount = Number(((discount / 100) * baseSubtotal).toFixed(2));
  const advancePaid = Number(event?.advance || 0);
  const securityAmt = Number(event?.security || 0);
  const paid = Number(
    (advancePaid + (includeSecurity ? securityAmt : 0)).toFixed(2),
  );
  const grandTotal = Number(
    (baseSubtotal - discountAmount + adjustmentsTotal).toFixed(2),
  );
  const pending = Number(Math.max(0, grandTotal - paid).toFixed(2));

  const formatINR = (n: number) => `₹${n.toFixed(2)}`;

  const updateManual = (i: number, patch: any) => {
    setManualLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const addManualLine = () => {
    setManualLines((p) => [
      ...p,
      { productId: "", desc: "", unitType: "pcs", qty: 1, rate: 0 },
    ]);
  };

  const removeManualLine = (i: number) => {
    setManualLines((p) => p.filter((_, idx) => idx !== i));
  };

  const saveDraft = async () => {
    try {
      const payload = {
        clientId: event.clientId?._id || event.clientId,
        eventId: event._id,
        withGST: false,
        language: "en",
        items: [...items, ...manualLines]
          .filter((it) => it.productId)
          .map((it) => ({
            productId: String(it.productId),
            desc: it.desc,
            unitType: it.unitType || "pcs",
            qty: Number(it.qty || 0),
            rate: Number(it.rate || 0),
          })),
        totals: {
          subTotal: baseSubtotal,
          tax: 0,
          discount: discountAmount,
          roundOff: 0,
          grandTotal,
          paid,
          pending,
        },
        status: "draft",
      };

      await invoiceAPI.create(payload);
      toast.success("Invoice saved as draft");
      window.location.href = "/invoices";
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to save invoice");
    }
  };

  const finalizeAndPDF = async () => {
    try {
      const payload = {
        clientId: event.clientId?._id || event.clientId,
        eventId: event._id,
        withGST: false,
        language: "en",
        items: [...items, ...manualLines]
          .filter((it) => it.productId)
          .map((it) => ({
            productId: String(it.productId),
            desc: it.desc,
            unitType: it.unitType || "pcs",
            qty: Number(it.qty || 0),
            rate: Number(it.rate || 0),
          })),
        totals: {
          subTotal: baseSubtotal,
          tax: 0,
          discount: discountAmount,
          roundOff: 0,
          grandTotal,
          paid,
          pending,
        },
        status: "final",
      };

      const res = await invoiceAPI.create(payload);
      toast.success("Invoice finalized");
      const inv = res.data;
      // download PDF
      const pdf = await invoiceAPI.downloadPDF(
        inv._id,
        inv.language || "en",
        inv.withGST,
      );
      const url = window.URL.createObjectURL(new Blob([pdf.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${inv.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.location.href = "/invoices";
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to finalize invoice");
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
        <h1 className="text-2xl font-bold">Invoice Builder</h1>
        <div className="text-sm text-muted-foreground">
          Client: {event.clientId?.name}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...items, ...manualLines].map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="font-medium">{row.desc || row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.unitType}
                    </div>
                  </TableCell>
                  <TableCell>{row.qty}</TableCell>
                  <TableCell>₹{Number(row.rate || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">
                    ₹{(Number(row.qty || 0) * Number(row.rate || 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4">
            <Label>Discount (%)</Label>
            <Input
              value={String(discount)}
              onChange={(e) => setDiscount(Number(e.target.value || 0))}
            />
          </div>

          <div className="mt-4">
            <Label>Manual Lines</Label>
            <div className="space-y-2">
              {manualLines.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={m.productId}
                    onChange={(e) =>
                      updateManual(i, { productId: e.target.value })
                    }
                    className="p-2 border rounded"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Description"
                    value={m.desc}
                    onChange={(e) => updateManual(i, { desc: e.target.value })}
                  />
                  <Input
                    type="number"
                    value={m.qty}
                    onChange={(e) =>
                      updateManual(i, { qty: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                  <Input
                    type="number"
                    value={m.rate}
                    onChange={(e) =>
                      updateManual(i, { rate: Number(e.target.value) })
                    }
                    className="w-28"
                  />
                  <Button variant="outline" onClick={() => removeManualLine(i)}>
                    Remove
                  </Button>
                </div>
              ))}
              <div>
                <Button variant="outline" onClick={addManualLine}>
                  Add Line
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 text-lg font-semibold">
            <div className="text-right">
              <div>SubTotal: {formatINR(baseSubtotal)}</div>
              <div>Adjustments: {formatINR(adjustmentsTotal)}</div>
              <div>Discount: {formatINR(discountAmount)}</div>
              <div>Grand Total: {formatINR(grandTotal)}</div>
              <div>Advance Paid: {formatINR(advancePaid)}</div>
              <div>
                <label className="mr-2">Include Security:</label>
                <input
                  type="checkbox"
                  checked={includeSecurity}
                  onChange={(e) => setIncludeSecurity(e.target.checked)}
                />{" "}
                {formatINR(securityAmt)}
              </div>
              <div className="mt-2 font-bold">
                Pending: {formatINR(pending)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button variant="outline" onClick={saveDraft}>
          Save Draft
        </Button>
        <Button onClick={finalizeAndPDF}>Finalize & PDF</Button>
      </div>
    </div>
  );
}
