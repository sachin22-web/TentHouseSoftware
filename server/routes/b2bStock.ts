import mongoose from "mongoose";
import { Response } from "express";
import { B2BStock, Product } from "../models";
import { AuthRequest } from "../utils/auth";
import {
  b2bStockCreateSchema,
  b2bStockUpdateSchema,
  b2bPurchaseSchema,
} from "../utils/validation";

const escapeRegExp = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findMatchingProductId = async (itemName: string) => {
  const normalized = itemName.trim();
  if (!normalized) return undefined;

  const product = await Product.findOne({
    name: { $regex: `^${escapeRegExp(normalized)}$`, $options: "i" },
  }).select("_id");

  return product?._id;
};

export const listB2BStock = async (req: AuthRequest, res: Response) => {
  try {
    const items = await B2BStock.find()
      .populate("productId", "name unitType stockQty")
      .sort({ itemName: 1 });

    res.json({ items });
  } catch (error) {
    console.error("List B2B stock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createB2BStock = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = b2bStockCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { itemName, supplierName, quantity, price } = value;
    const normalizedName = itemName.trim().toLowerCase();

    const existing = await B2BStock.findOne({
      normalizedItemName: normalizedName,
    });

    if (existing) {
      existing.quantityAvailable += quantity;
      existing.unitPrice = price;
      existing.supplierName = supplierName;
      existing.purchaseLogs.push({
        quantity,
        price,
        supplierName,
        createdAt: new Date(),
      });
      if (!existing.productId) {
        const matchedProductId = await findMatchingProductId(itemName);
        if (matchedProductId) existing.productId = matchedProductId;
      }
      await existing.save();

      const populatedExisting = await existing.populate(
        "productId",
        "name unitType stockQty",
      );
      return res.status(200).json({ item: populatedExisting, merged: true });
    }

    const matchedProductId = await findMatchingProductId(itemName);

    const b2bStock = new B2BStock({
      itemName: itemName.trim(),
      supplierName: supplierName.trim(),
      quantityAvailable: quantity,
      unitPrice: price,
      productId: matchedProductId,
      purchaseLogs: [
        {
          quantity,
          price,
          supplierName,
          createdAt: new Date(),
        },
      ],
    });

    await b2bStock.save();

    const populated = await b2bStock.populate(
      "productId",
      "name unitType stockQty",
    );

    res.status(201).json({ item: populated });
  } catch (error) {
    console.error("Create B2B stock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateB2BStock = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = b2bStockUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const item = await B2BStock.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "B2B stock item not found" });
    }

    if (typeof value.itemName === "string") {
      item.itemName = value.itemName.trim();
    }
    if (typeof value.supplierName === "string") {
      item.supplierName = value.supplierName.trim();
    }
    if (typeof value.quantity === "number") {
      if (value.quantity < 0) {
        return res.status(400).json({ error: "Quantity cannot be negative" });
      }

      const prevQty = Number(item.quantityAvailable) || 0;
      const nextQty = Number(value.quantity) || 0;
      const delta = nextQty - prevQty;

      // If linked to a product, treat delta as transfer between main and B2B
      const linkedProductId = (value.productId as any) ||
        ((item.productId && typeof (item.productId as any) === "object")
          ? (item.productId as any)._id
          : (item.productId as any));
      if (delta !== 0 && linkedProductId) {
        const product = await Product.findById(linkedProductId);
        if (!product) {
          return res.status(400).json({ error: "Linked product not found for transfer" });
        }
        if (delta > 0) {
          // Moving from main -> B2B; ensure enough main stock
          if ((Number(product.stockQty) || 0) < delta) {
            return res.status(400).json({ error: "Insufficient main stock to transfer to B2B" });
          }
          product.stockQty = (Number(product.stockQty) || 0) - delta;
          await product.save();
        } else if (delta < 0) {
          // Moving from B2B -> main
          product.stockQty = (Number(product.stockQty) || 0) + (-delta);
          await product.save();
        }
      }

      item.quantityAvailable = nextQty;
    }
    if (typeof value.price === "number") {
      item.unitPrice = value.price;
    }

    if (Object.prototype.hasOwnProperty.call(value, "productId")) {
      const provided = value.productId;
      if (!provided) {
        item.productId = undefined;
      } else if (mongoose.Types.ObjectId.isValid(provided)) {
        item.productId = new mongoose.Types.ObjectId(provided);
      } else {
        return res.status(400).json({ error: "Invalid product reference" });
      }
    } else if (!item.productId && item.itemName) {
      const matchedProductId = await findMatchingProductId(item.itemName);
      if (matchedProductId) item.productId = matchedProductId;
    }

    await item.save();

    const populated = await item.populate(
      "productId",
      "name unitType stockQty",
    );

    res.json({ item: populated });
  } catch (error) {
    console.error("Update B2B stock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteB2BStock = async (req: AuthRequest, res: Response) => {
  try {
    const item = await B2BStock.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "B2B stock item not found" });
    }

    res.json({ message: "B2B stock item deleted" });
  } catch (error) {
    console.error("Delete B2B stock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createB2BPurchase = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = b2bPurchaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const item = await B2BStock.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "B2B stock item not found" });
    }

    const { quantity, price, supplierName } = value;

    item.quantityAvailable += quantity;
    item.unitPrice = price;
    item.supplierName = supplierName;
    item.purchaseLogs.push({
      quantity,
      price,
      supplierName,
      createdAt: new Date(),
    });

    await item.save();

    const populated = await item.populate(
      "productId",
      "name unitType stockQty",
    );

    res.status(201).json({ item: populated });
  } catch (error) {
    console.error("Create B2B purchase error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
