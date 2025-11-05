import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { productAPI, eventAPI } from "@/lib/api";
import { toast } from "sonner";

interface EventType {
  _id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  clientId?: { _id: string; name: string; phone: string };
  advance?: number;
  security?: number;
  selections?: any[];
  agreementTerms?: string;
  dispatches?: any[];
  dispatchDrafts?: any[];
  agreementSnapshot?: { items: any[] } | null;
  status?: "new" | "confirmed" | "reserved" | "dispatched" | "returned";
}

interface ProductType {
  _id: string;
  name: string;
  sku?: string;
  unitType: string;
  stockQty: number;
  sellPrice: number;
}

interface Row extends ProductType {
  qtyToSend: number;
  rate: number;
  amount: number;
}

export default function EventAgreement() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventType | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [advance, setAdvance] = useState<string>("0");
  const [security, setSecurity] = useState<string>("0");
  const [terms, setTerms] = useState<string>("");
  const navigate = useNavigate();

  // Signatures
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [companySign, setCompanySign] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const evRes = await eventAPI.getById(id!);
        const ev: EventType = evRes.data;
        setEvent(ev);
        setAdvance(String(ev.advance ?? 0));
        setSecurity(String(ev.security ?? 0));
        setTerms(ev.agreementTerms || "");

        // Prefer confirmed dispatch if available, otherwise draft if reserved
        const lastDraft = ev.dispatchDrafts?.[ev.dispatchDrafts.length - 1];
        const lastDispatch = ev.dispatches?.[ev.dispatches.length - 1];
        let source: any = null;
        let sourceIsDraft = false;
        if (
          ev.status === "dispatched" &&
          lastDispatch &&
          Array.isArray(lastDispatch.items) &&
          lastDispatch.items.length > 0
        ) {
          source = lastDispatch;
        } else if (
          ev.status === "reserved" &&
          lastDraft &&
          Array.isArray(lastDraft.items) &&
          lastDraft.items.length > 0
        ) {
          source = lastDraft;
          sourceIsDraft = true;
        } else if (
          lastDispatch &&
          Array.isArray(lastDispatch.items) &&
          lastDispatch.items.length > 0
        ) {
          source = lastDispatch;
        } else if (
          lastDraft &&
          Array.isArray(lastDraft.items) &&
          lastDraft.items.length > 0
        ) {
          source = lastDraft;
          sourceIsDraft = true;
        }

        if (source) {
          const rows: Row[] = source.items.map((p: any) => ({
            _id: p.productId,
            name: p.name,
            sku: p.sku,
            unitType: p.unitType,
            stockQty: Number(p.stockQty || 0),
            sellPrice: Number(p.rate || 0),
            qtyToSend: Number(p.qtyToSend || p.qty || 0),
            rate: Number(p.rate || 0),
            amount: Number(
              (Number(p.qtyToSend || p.qty || 0) * Number(p.rate || 0)).toFixed(
                2,
              ),
            ),
          }));
          // If the source is a draft (reserved), we want to show the values but not allow edits to qty/rate
          setItems(rows);
          // attach a flag to the event object to indicate readonly source
          (ev as any).__useDispatchDraft = sourceIsDraft;
          setEvent(ev);
        } else {
          // fallback to product catalog and previous selections
          const prodRes = await productAPI.getAll({ limit: 1000 });
          const products: ProductType[] = prodRes.data?.products || [];
          const rows: Row[] = products.map((p) => ({
            ...p,
            qtyToSend: 0,
            rate: p.sellPrice || 0,
            amount: 0,
          }));

          if (Array.isArray(ev.selections) && ev.selections.length > 0) {
            ev.selections.forEach((s: any) => {
              const i = rows.findIndex(
                (r) => r._id === s.productId || r.sku === s.sku,
              );
              if (i >= 0) {
                rows[i].qtyToSend = Number(s.qtyToSend || 0);
                rows[i].rate = Number(s.rate || rows[i].rate || 0);
                rows[i].amount = rows[i].qtyToSend * rows[i].rate;
              }
            });
          }

          setItems(rows);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load agreement data");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const grandTotal = useMemo(() => {
    const total = items.reduce(
      (sum, it) => sum + (it.qtyToSend > 0 ? it.qtyToSend * it.rate : 0),
      0,
    );
    return Number(total.toFixed(2));
  }, [items]);

  const formatINR = (n: number) => `₹${n.toFixed(2)}`;

  const startDraw = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const endDraw = () => setIsDrawing(false);
  const clearSign = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setItems((prev) => {
      const next = [...prev];
      const r = { ...next[idx], ...patch } as Row;
      if (r.qtyToSend < 0) r.qtyToSend = 0;
      r.rate = Number(isNaN(Number(r.rate)) ? 0 : r.rate);
      r.amount = Number((r.qtyToSend * r.rate).toFixed(2));
      next[idx] = r;
      return next;
    });
  };

  const handleSave = async () => {
    try {
      const selections = items
        .filter((r) => r.qtyToSend > 0)
        .map((r) => ({
          productId: r._id,
          name: r.name,
          sku: r.sku,
          unitType: r.unitType,
          stockQty: r.stockQty,
          qtyToSend: r.qtyToSend,
          rate: r.rate,
          amount: Number((r.qtyToSend * r.rate).toFixed(2)),
        }));
      const payload = {
        items: selections.map((s) => ({
          itemId: s.productId,
          name: s.name,
          sku: s.sku,
          uom: s.unitType,
          qty: s.qtyToSend,
          rate: s.rate,
          amount: s.amount,
        })),
        advance: Number(advance || 0),
        security: Number(security || 0),
        terms: terms,
        grandTotal: Number(
          (
            selections.reduce((sum, r) => sum + r.amount, 0) -
            Number(advance || 0) -
            Number(security || 0)
          ).toFixed(2),
        ),
      };
      const resp = await eventAPI.saveAgreement(id!, payload);
      setEvent(resp.data);
      toast.success("Agreement saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to save agreement");
    }
  };

  if (loading || !event) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Terms & Conditions</h1>
        <div className="text-right">
          <div className="text-sm">
            Client: <span className="font-medium">{event.clientId?.name}</span>{" "}
            ({event.clientId?.phone})
          </div>
          <div className="text-sm text-muted-foreground">
            Schedule: {new Date(event.dateFrom).toLocaleDateString("en-IN")} -{" "}
            {new Date(event.dateTo).toLocaleDateString("en-IN")}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>
                  {(event as any)?.__useConfirmedDispatch
                    ? "Qty"
                    : "Qty To Send"}
                </TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, idx) => (
                <TableRow key={row._id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.sku || "-"}</TableCell>
                  <TableCell>{row.unitType}</TableCell>
                  <TableCell>{row.stockQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={row.qtyToSend}
                      onChange={(e) =>
                        updateRow(idx, { qtyToSend: Number(e.target.value) })
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.rate}
                      onChange={(e) =>
                        updateRow(idx, { rate: Number(e.target.value) })
                      }
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatINR(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4 text-lg font-semibold">
            Grand Total: {formatINR(grandTotal)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Advance Amount</Label>
              <Input
                value={advance}
                onChange={(e) =>
                  setAdvance(e.target.value.replace(/[^0-9.]/g, ""))
                }
              />
            </div>
            <div>
              <Label>Security (Optional)</Label>
              <Input
                value={security}
                onChange={(e) =>
                  setSecurity(e.target.value.replace(/[^0-9.]/g, ""))
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={6}
              placeholder="Write agreement terms..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button
          onClick={() => {
            if ((event as any)?.agreementSnapshot?.items?.length) {
              navigate(`/admin/events/${id}/agreement/preview`);
            } else {
              toast.info("Save T&C first");
            }
          }}
          disabled={!Boolean((event as any)?.agreementSnapshot?.items?.length)}
          title={
            !Boolean((event as any)?.agreementSnapshot?.items?.length)
              ? "Save T&C first"
              : undefined
          }
        >
          Preview
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const resp = await eventAPI.downloadAgreement(id!);
              const url = window.URL.createObjectURL(
                new Blob([resp.data], { type: "application/pdf" }),
              );
              const a = document.createElement("a");
              a.href = url;
              const clientName =
                event?.clientId?.name?.replace(/\s+/g, "_") || "client";
              const dateStr = new Date().toISOString().slice(0, 10);
              a.download = `agreement-${clientName}-${dateStr}.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e: any) {
              console.error(e);
              toast.error(e.response?.data?.error || "Failed to download PDF");
            }
          }}
        >
          Print/PDF
        </Button>
        <Button
          onClick={() =>
            (window.location.href = `/admin/events/${id}/agreement/sign`)
          }
        >
          Proceed to e-Sign
        </Button>
        <Button
          onClick={() => (window.location.href = `/admin/events/${id}/invoice`)}
        >
          Create Invoice
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
