import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eventAPI } from "@/lib/api";
import { toast } from "sonner";

const DEFAULT_TERMS: string[] = [
  "Goods are rented for the specified event duration only. Additional days will be charged extra.",
  "Any damage, loss, or shortage will be charged at actual replacement or repair cost.",
  "Security deposit, if any, will be refunded after complete return and quality check of all items.",
  "Customer is responsible for safe custody of items at the event site.",
  "Payment terms: advance to confirm booking; balance on delivery unless otherwise agreed in writing.",
];

export default function EventAgreementPreview() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await eventAPI.getById(id!);
        const ev = res.data;
        if (!ev?.agreementSnapshot?.items?.length) {
          toast.info("No saved agreement");
          navigate(-1);
          return;
        }
        setEvent(ev);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load agreement preview");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, navigate]);

  const onPrint = () => window.print();

  const onDownload = async () => {
    try {
      const resp = await eventAPI.downloadAgreement(id!);
      const url = window.URL.createObjectURL(
        new Blob([resp.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `agreement-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to download PDF");
    }
  };

  // Derive snapshot/rows safely and compute totals/terms with useMemo BEFORE any returns
  const snap = event?.agreementSnapshot;
  const rows: any[] = snap?.items?.length
    ? snap.items
    : event?.dispatches && event.dispatches.length
      ? event.dispatches[event.dispatches.length - 1].items
      : event?.selections || [];

  const computed = useMemo(() => {
    const subtotal = rows.reduce((s: number, it: any) => {
      const qty = Number(it?.qtyToSend ?? it?.qty ?? it?.qtyReturned ?? 0);
      const rate = Number(it?.rate ?? it?.sellPrice ?? 0);
      const amount =
        typeof it?.amount === "number"
          ? Number(it.amount)
          : Number((qty * rate).toFixed(2));
      return s + amount;
    }, 0);

    const advance = Number(snap?.advance ?? event?.advance ?? 0);
    const security = Number(snap?.security ?? event?.security ?? 0);
    const grandTotal = Number((snap?.grandTotal ?? subtotal).toFixed(2));
    const amountDue = Math.max(
      0,
      Number((grandTotal - advance - security).toFixed(2)),
    );

    const termsText = (snap?.terms || event?.agreementTerms || "").trim();
    const terms = termsText
      ? termsText
          .split(/\n+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : DEFAULT_TERMS;

    return { subtotal, advance, security, grandTotal, amountDue, terms };
  }, [rows, snap, event]);

  if (loading || !event) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 print:p-0">
      {/* Actions */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-2xl font-bold">Terms & Conditions / Agreement</h1>
        <div className="flex gap-2">
          <Button onClick={onPrint}>Print</Button>
          <Button onClick={onDownload}>Download PDF</Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            onClick={() => navigate(`/admin/events/${id}/agreement/sign`)}
          >
            Proceed to e-Sign
          </Button>
        </div>
      </div>

      {/* Printable sheet */}
      <div className="mx-auto max-w-[900px] bg-white rounded-md border shadow-sm print:shadow-none print:border-0 print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              Mannat Tent House
            </div>
            <div className="text-sm text-muted-foreground">
              Agreement / Job Sheet
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">Date</div>
            <div>{new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        {/* Parties & Event */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="text-xs uppercase text-muted-foreground mb-2">
                Client
              </div>
              <div className="font-medium">{event.clientId?.name}</div>
              <div className="text-sm">{event.clientId?.phone}</div>
              {event.clientId?.address && (
                <div className="text-sm">{event.clientId.address}</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="text-xs uppercase text-muted-foreground mb-2">
                Event
              </div>
              <div className="text-sm">
                Schedule: {new Date(event.dateFrom).toLocaleString("en-IN")} –{" "}
                {new Date(event.dateTo).toLocaleString("en-IN")}
              </div>
              {event.location && (
                <div className="text-sm">Venue: {event.location}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Products */}
        <div className="p-6">
          <div className="rounded-md border">
            <Table className="text-sm">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((it: any, i: number) => {
                  const qty = Number(
                    it?.qtyToSend ?? it?.qty ?? it?.qtyReturned ?? 0,
                  );
                  const rate = Number(it?.rate ?? it?.sellPrice ?? 0);
                  const amount = Number((qty * rate).toFixed(2));
                  return (
                    <TableRow key={i} className="border-b last:border-0">
                      <TableCell className="w-[45%]">
                        {it?.name || it?.productId?.name}
                      </TableCell>
                      <TableCell className="w-[15%]">
                        {it?.unitType || it?.productId?.unitType}
                      </TableCell>
                      <TableCell className="text-right w-[10%]">
                        {qty}
                      </TableCell>
                      <TableCell className="text-right w-[15%]">
                        ₹{rate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right w-[15%]">
                        ₹{amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full sm:w-80 border rounded-md p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  ₹{computed.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Advance</span>
                <span>₹{computed.advance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Security</span>
                <span>₹{computed.security.toFixed(2)}</span>
              </div>
              <div className="border-t mt-3 pt-3 flex items-center justify-between">
                <span className="font-semibold">Grand Total</span>
                <span className="font-semibold">
                  ₹{computed.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="font-medium">
                  ₹{computed.amountDue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms (moved to bottom) */}
        <div className="px-6 pb-4">
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="text-xs uppercase text-muted-foreground mb-3">
                Terms
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-sm leading-6">
                {computed.terms.map((line: string, i: number) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Signatures */}
        <div className="px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-muted-foreground">
              Client Signature
            </div>
            <div className="mt-6 border-t" />
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              Company Signature
            </div>
            <div className="mt-6 border-t" />
          </div>
        </div>
      </div>
    </div>
  );
}
