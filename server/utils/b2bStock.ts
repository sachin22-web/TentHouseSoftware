import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { B2BStock } from "../models/B2BStock";
import type { IB2BStock } from "../models/B2BStock";
import type { IProduct } from "../models/Product";

export interface B2BUsage {
  stockId: mongoose.Types.ObjectId;
  itemName: string;
  supplierName: string;
  unitPrice: number;
  quantity: number;
}

export interface StockConsumptionResult {
  mainUsed: number;
  b2bUsed: number;
  b2bUsages: B2BUsage[];
  projectedStock: number;
}

type ProductDocument = mongoose.Document<unknown, any, IProduct> &
  IProduct & {
    _id: mongoose.Types.ObjectId;
  };

type B2BStockDocument = mongoose.Document<unknown, any, IB2BStock> &
  IB2BStock & {
    _id: mongoose.Types.ObjectId;
  };

interface ConsumeOptions {
  product: ProductDocument;
  quantity: number;
  session?: ClientSession;
  dryRun?: boolean;
}

const normalizeName = (name: string | undefined | null) =>
  (name ?? "").trim().toLowerCase();

const getB2BQuery = (
  product: ProductDocument,
): mongoose.FilterQuery<IB2BStock> => {
  const normalizedName = normalizeName(product.name);

  const orConditions: mongoose.FilterQuery<IB2BStock>[] = [];
  if (product._id) {
    orConditions.push({ productId: product._id });
  }
  if (normalizedName) {
    orConditions.push({ normalizedItemName: normalizedName });
  }

  return {
    quantityAvailable: { $gt: 0 },
    ...(orConditions.length ? { $or: orConditions } : {}),
  };
};

export const consumeProductStock = async ({
  product,
  quantity,
  session,
  dryRun = false,
}: ConsumeOptions): Promise<StockConsumptionResult> => {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const mainAvailable = Number(product.stockQty) || 0;
  const mainUsed = Math.min(mainAvailable, quantity);
  let remaining = quantity - mainUsed;

  const usages: B2BUsage[] = [];

  if (remaining > 0) {
    const query = B2BStock.find(getB2BQuery(product)).sort({
      lastUsedAt: 1,
      createdAt: 1,
    });

    if (session) {
      query.session(session);
    }

    const fallbackItems = (await query.exec()) as B2BStockDocument[];

    for (const item of fallbackItems) {
      if (remaining <= 0) break;

      const available = Number(item.quantityAvailable) || 0;
      if (available <= 0) continue;

      const take = Math.min(available, remaining);
      if (take <= 0) continue;

      usages.push({
        stockId: item._id,
        itemName: item.itemName,
        supplierName: item.supplierName,
        unitPrice: Number(item.unitPrice) || 0,
        quantity: take,
      });

      remaining -= take;

      if (!dryRun) {
        item.quantityAvailable = available - take;
        item.lastUsedAt = new Date();
        await item.save({ session });
      }
    }
  }

  if (remaining > 0) {
    const totalB2BUsed = quantity - mainUsed - remaining;
    const error: Error & {
      code?: string;
      details?: Record<string, unknown>;
    } = new Error("Insufficient stock including B2B inventory");
    error.code = "INSUFFICIENT_STOCK";
    error.details = {
      requested: quantity,
      mainAvailable,
      b2bAvailable: totalB2BUsed,
    };
    throw error;
  }

  if (!dryRun) {
    product.stockQty = mainAvailable - mainUsed;
    await product.save({ session });
  }

  const projectedStock = mainAvailable - mainUsed;
  const b2bUsed = quantity - mainUsed;

  return {
    mainUsed,
    b2bUsed,
    b2bUsages: usages,
    projectedStock,
  };
};
