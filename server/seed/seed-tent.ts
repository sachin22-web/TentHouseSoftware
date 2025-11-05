import dotenv from "dotenv";
import mongoose from "mongoose";
import connect from "../db.js";
import { Client, Product, Worker, Lead, Payment } from "../models";

dotenv.config();

async function ensureIndexes() {
  await Client.collection.createIndex({ phone: 1 }, { unique: true });
  await Product.collection.createIndex(
    { sku: 1 },
    { unique: true, sparse: true },
  );
}

async function upsertClient(
  name: string,
  phone: string,
  extra: Partial<any> = {},
) {
  const res = await Client.findOneAndUpdate(
    { phone },
    { $setOnInsert: { name, phone }, $set: { ...extra } },
    { upsert: true, new: true },
  );
  return res;
}

async function upsertProduct(
  name: string,
  sku: string | undefined,
  category: string,
  unitType: any,
  buyPrice: number,
  sellPrice: number,
  stockQty: number,
) {
  const q: any = sku ? { sku } : { name };
  const res = await Product.findOneAndUpdate(
    q,
    {
      $setOnInsert: { name },
      $set: { sku, category, unitType, buyPrice, sellPrice, stockQty },
    },
    { upsert: true, new: true },
  );
  return res;
}

async function upsertWorker(
  name: string,
  phone: string,
  dailyRate: number,
  halfDayRate?: number,
) {
  const res = await Worker.findOneAndUpdate(
    { name, phone },
    { $setOnInsert: { name, phone, dailyRate, halfDayRate } },
    { upsert: true, new: true },
  );
  return res;
}

async function upsertLead(name: string, phone: string, status: any = "new") {
  const res = await Lead.findOneAndUpdate(
    { phone },
    { $setOnInsert: { name, phone, status } },
    { upsert: true, new: true },
  );
  return res;
}

async function seed() {
  try {
    await connect();
    await ensureIndexes();

    const c1 = await upsertClient("Rahul Sharma", "9876543210", {
      address: "Jaipur",
    });
    const c2 = await upsertClient("Priya Singh", "9876500001", {
      address: "Ajmer",
    });

    await upsertLead("Amit Verma", "9999900001", "hot");
    await upsertLead("Neha Gupta", "9999900002", "callback");

    await upsertProduct(
      "Banquet Chair",
      "CHAIR-001",
      "Seating",
      "pcs",
      600,
      50,
      200,
    );
    await upsertProduct(
      "Round Table",
      "TABLE-001",
      "Tables",
      "pcs",
      2000,
      200,
      50,
    );
    await upsertProduct(
      "LED Light",
      "LIGHT-LED-01",
      "Lighting",
      "pcs",
      1500,
      120,
      40,
    );

    await upsertWorker("Mukesh Kumar", "8888800001", 700, 400);
    await upsertWorker("Suresh", "8888800002", 650, 350);

    const invoicePayments = await Payment.countDocuments();
    if (invoicePayments === 0) {
      // Placeholder seed for payments will be attached when invoices are created
    }

    console.log("Seed completed");
  } catch (e) {
    console.error("Seed failed", e);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
