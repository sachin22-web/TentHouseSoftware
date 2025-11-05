import PDFDocument from "pdfkit";
import { Response } from "express";
import { IInvoice } from "../models";

interface PDFInvoice extends IInvoice {
  clientId: {
    name: string;
    phone: string;
    address: string;
    gstin?: string;
  };
  items: Array<{
    productId: {
      name: string;
      unitType: string;
    };
    desc?: string;
    unitType: string;
    qty: number;
    rate: number;
    taxPct?: number;
  }>;
}

const translations = {
  en: {
    invoice: "INVOICE",
    company: "Mannat Tent House",
    invoiceNo: "Invoice No",
    date: "Date",
    billTo: "Bill To",
    gstin: "GSTIN",
    description: "Description",
    unit: "Unit",
    qty: "Qty",
    rate: "Rate",
    amount: "Amount",
    tax: "Tax",
    subtotal: "Subtotal",
    discount: "Discount",
    roundOff: "Round Off",
    grandTotal: "Grand Total",
    paid: "Paid",
    pending: "Pending",
    thankYou: "Thank you for your business!",
  },
  hi: {
    invoice: "चालान",
    company: "मन्नत टेंट हाउस",
    invoiceNo: "चालान संख्या",
    date: "दिनांक",
    billTo: "बिल प्राप्तकर्ता",
    gstin: "जीएसटीआईएन",
    description: "विवरण",
    unit: "इकाई",
    qty: "मात्रा",
    rate: "दर",
    amount: "राशि",
    tax: "कर",
    subtotal: "उप योग",
    discount: "छूट",
    roundOff: "राउंड ऑफ",
    grandTotal: "कुल योग",
    paid: "भुगतान",
    pending: "बकाया",
    thankYou: "आपके व्यवसाय के लिए धन्यवाद!",
  },
} as const;

const DEFAULT_TERMS: string[] = [
  "Goods are rented for the specified event duration only. Additional days will be charged extra.",
  "Any damage, loss, or shortage will be charged at actual replacement or repair cost.",
  "Security deposit, if any, is refundable after complete return and quality check of goods.",
  "Customer is responsible for safe custody of items at the event site.",
  "Payment terms: advance to confirm booking; balance on delivery unless otherwise agreed in writing.",
];

const formatINR = (n: number) =>
  `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const generateInvoicePDF = (
  invoice: PDFInvoice,
  language: "en" | "hi" = "en",
  res: Response,
) => {
  const doc = new PDFDocument({ margin: 50 });
  const t = translations[language];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${invoice.number}.pdf`,
  );

  doc.pipe(res);

  // Header block
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(t.company, 50, 40, { width: 300 });
  doc.fontSize(12).font("Helvetica").text(t.invoice, 50, 70);

  // Invoice meta box
  doc
    .roundedRect(350, 40, 200, 45, 6)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`${t.invoiceNo}: ${invoice.number}`, 360, 50)
    .text(`${t.date}: ${new Date(invoice.date).toLocaleDateString()}`, 360, 65);

  // Bill to box
  doc.fontSize(11).font("Helvetica-Bold").text(t.billTo, 50, 110);
  doc
    .roundedRect(50, 125, 500, 70, 6)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(invoice.clientId.name, 60, 138)
    .text(invoice.clientId.phone, 60, 153)
    .text(invoice.clientId.address, 60, 168);
  if (invoice.withGST && invoice.clientId.gstin) {
    doc.text(`${t.gstin}: ${invoice.clientId.gstin}`, 60, 183);
  }

  // Table header background
  const tableTop = 215;
  doc.save().rect(50, tableTop, 500, 20).fillColor("#f3f4f6").fill().restore();

  const descriptionX = 60;
  const unitX = 300;
  const qtyX = 360;
  const rateX = 420;
  const amountX = 500;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text(t.description, descriptionX, tableTop + 5);
  doc.text(t.unit, unitX, tableTop + 5);
  doc.text(t.qty, qtyX, tableTop + 5);
  doc.text(t.rate, rateX, tableTop + 5);
  doc.text(t.amount, amountX, tableTop + 5);

  // Items
  let y = tableTop + 26;
  doc.font("Helvetica").fontSize(9);
  invoice.items.forEach((item) => {
    const lineAmount = item.qty * item.rate;
    const taxAmount =
      invoice.withGST && item.taxPct ? lineAmount * (item.taxPct / 100) : 0;

    doc.text(item.desc || item.productId.name, descriptionX, y, { width: 220 });
    doc.text(item.unitType, unitX, y);
    doc.text(item.qty.toString(), qtyX, y);
    doc.text(formatINR(item.rate), rateX, y);
    doc.text(formatINR(lineAmount), amountX, y);

    if (invoice.withGST && taxAmount > 0) {
      doc.text(formatINR(taxAmount), amountX + 60, y);
    }

    y += 18;
    doc
      .moveTo(50, y)
      .lineTo(550, y)
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .stroke();
    y += 4;
  });

  // Totals box
  y += 10;
  const boxY = y;
  doc
    .roundedRect(320, boxY, 230, 110, 6)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  let ty = boxY + 10;
  const labelX = 330;
  const valueX = 530 - 10;

  doc.fontSize(10).font("Helvetica");
  doc.text(`${t.subtotal}:`, labelX, ty, { width: 160, align: "right" });
  doc.text(formatINR(invoice.totals.subTotal), valueX - 80, ty, {
    align: "right",
  });

  if (invoice.withGST && invoice.totals.tax > 0) {
    ty += 15;
    doc.text(`${t.tax}:`, labelX, ty, { width: 160, align: "right" });
    doc.text(formatINR(invoice.totals.tax), valueX - 80, ty, {
      align: "right",
    });
  }

  if (invoice.totals.discount && invoice.totals.discount > 0) {
    ty += 15;
    doc.text(`${t.discount}:`, labelX, ty, { width: 160, align: "right" });
    doc.text(`- ${formatINR(invoice.totals.discount)}`, valueX - 80, ty, {
      align: "right",
    });
  }

  if (invoice.totals.roundOff && invoice.totals.roundOff !== 0) {
    ty += 15;
    doc.text(`${t.roundOff}:`, labelX, ty, { width: 160, align: "right" });
    doc.text(formatINR(invoice.totals.roundOff), valueX - 80, ty, {
      align: "right",
    });
  }

  ty += 20;
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`${t.grandTotal}:`, labelX, ty, { width: 160, align: "right" });
  doc.text(formatINR(invoice.totals.grandTotal), valueX - 80, ty, {
    align: "right",
  });

  // Paid/Pending
  if (invoice.totals.paid > 0 || invoice.totals.pending > 0) {
    ty += 18;
    doc.font("Helvetica").fontSize(10);
    doc.text(`${t.paid}:`, labelX, ty, { width: 160, align: "right" });
    doc.text(formatINR(invoice.totals.paid), valueX - 80, ty, {
      align: "right",
    });
    ty += 14;
    doc.text(`${t.pending}:`, labelX, ty, { width: 160, align: "right" });
    doc.text(formatINR(invoice.totals.pending), valueX - 80, ty, {
      align: "right",
    });
  }

  // Footer
  doc
    .fontSize(10)
    .font("Helvetica-Oblique")
    .text(t.thankYou, 50, doc.page.height - 80, { align: "center" });

  doc.end();
};

export const generateAgreementPDF = (
  event: any,
  language: "en" | "hi" = "en",
  res: Response,
) => {
  const doc = new PDFDocument({ margin: 50 });
  const t = translations[language] || translations.en;

  res.setHeader("Content-Type", "application/pdf");
  const clientName = event.clientId?.name?.replace(/\s+/g, "_") || "client";
  const dateStr = new Date().toISOString().slice(0, 10);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=agreement-${clientName}-${dateStr}.pdf`,
  );

  doc.pipe(res);

  // Title
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Terms & Conditions / Agreement", { align: "center" });
  doc.moveDown(0.5);

  // Client / Event boxes
  doc
    .roundedRect(50, 80, 240, 90, 6)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  doc.fontSize(11).font("Helvetica-Bold").text("Client", 60, 90);
  doc.font("Helvetica").fontSize(10);
  doc.text(event.clientId?.name || "-", 60, 106);
  doc.text(event.clientId?.phone || "-", 60, 121);
  if (event.clientId?.address)
    doc.text(event.clientId.address, 60, 136, { width: 220 });

  doc
    .roundedRect(310, 80, 240, 90, 6)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  doc.fontSize(11).font("Helvetica-Bold").text("Event", 320, 90);
  const from = event.dateFrom
    ? new Date(event.dateFrom).toLocaleString("en-IN")
    : "-";
  const to = event.dateTo
    ? new Date(event.dateTo).toLocaleString("en-IN")
    : "-";
  doc.font("Helvetica").fontSize(10);
  doc.text(`Schedule: ${from} – ${to}`, 320, 106, { width: 220 });
  if (event.location)
    doc.text(`Venue: ${event.location}`, 320, 121, { width: 220 });

  // Terms
  let y = 190;
  doc.fontSize(11).font("Helvetica-Bold").text("Terms", 50, y);
  y += 14;
  const termsText = (
    event.agreementSnapshot?.terms ||
    event.agreementTerms ||
    ""
  ).trim();
  const terms = termsText
    ? termsText
        .split(/\n+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : DEFAULT_TERMS;
  doc.font("Helvetica").fontSize(10);
  doc.list(terms, 50, y, { width: 500, bulletRadius: 2 });
  y = doc.y + 10;

  // Products table
  const tableTop = y + 10;
  doc.save().rect(50, tableTop, 500, 18).fillColor("#f3f4f6").fill().restore();
  const colX = {
    name: 60,
    uom: 300,
    qty: 360,
    rate: 420,
    amount: 500,
  } as const;
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Item", colX.name, tableTop + 4);
  doc.text("UOM", colX.uom, tableTop + 4);
  doc.text("Qty", colX.qty, tableTop + 4);
  doc.text("Rate", colX.rate, tableTop + 4);
  doc.text("Amount", colX.amount, tableTop + 4);

  let ty = tableTop + 22;
  doc.font("Helvetica").fontSize(10);
  let subtotal = 0;
  const rows =
    event.agreementSnapshot?.items && event.agreementSnapshot.items.length
      ? event.agreementSnapshot.items
      : event.dispatches && event.dispatches.length
        ? event.dispatches[event.dispatches.length - 1].items
        : event.selections || [];
  rows.forEach((it: any) => {
    const name = it.name || it.productId?.name || "-";
    const uom = it.unitType || it.productId?.unitType || "-";
    const qty = Number(it.qtyToSend ?? it.qty ?? it.qtyReturned ?? 0);
    const rate = Number(it.rate ?? it.sellPrice ?? it.rate ?? 0);
    const amount = Number((qty * rate).toFixed(2));
    subtotal += amount;

    doc.text(name, colX.name, ty, { width: 220 });
    doc.text(uom, colX.uom, ty);
    doc.text(String(qty), colX.qty, ty);
    doc.text(formatINR(rate), colX.rate, ty);
    doc.text(formatINR(amount), colX.amount, ty);

    ty += 18;
    doc
      .moveTo(50, ty)
      .lineTo(550, ty)
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .stroke();
    ty += 4;
  });

  // Totals
  const adv = Number(event.agreementSnapshot?.advance ?? event.advance ?? 0);
  const sec = Number(event.agreementSnapshot?.security ?? event.security ?? 0);
  const grand = Number(
    (event.agreementSnapshot?.grandTotal ?? subtotal).toFixed(2),
  );
  const due = Math.max(0, Number((grand - adv - sec).toFixed(2)));

  ty += 6;
  doc
    .roundedRect(320, ty, 230, 90, 6)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  let sx = 330;
  let sy = ty + 10;
  doc.font("Helvetica").fontSize(10);
  doc.text("Subtotal:", sx, sy, { width: 160, align: "right" });
  doc.text(formatINR(subtotal), 520, sy, { align: "right" });
  sy += 14;
  doc.text("Advance:", sx, sy, { width: 160, align: "right" });
  doc.text(formatINR(adv), 520, sy, { align: "right" });
  sy += 14;
  doc.text("Security:", sx, sy, { width: 160, align: "right" });
  doc.text(formatINR(sec), 520, sy, { align: "right" });
  sy += 16;
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Grand Total:", sx, sy, { width: 160, align: "right" });
  doc.text(formatINR(grand), 520, sy, { align: "right" });
  sy += 14;
  doc.font("Helvetica").fontSize(10);
  doc.text("Amount Due:", sx, sy, { width: 160, align: "right" });
  doc.text(formatINR(due), 520, sy, { align: "right" });

  // Signatures
  const sigY = sy + 40;
  doc.fontSize(10).font("Helvetica").text("Client Signature:", 60, sigY);
  doc.text("____________________________", 60, sigY + 15);
  doc.text("Company Signature:", 360, sigY);
  doc.text("____________________________", 360, sigY + 15);

  doc.end();
};
