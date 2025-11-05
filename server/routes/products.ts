import { Response } from "express";
import { Product } from "../models";
import { AuthRequest } from "../utils/auth";
import { productSchema, productUpdateSchema } from "../utils/validation";

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "", category = "" } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    const products = await Product.find(query)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ name: 1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    console.log("Received product data:", req.body);
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      console.error("Product validation error:", error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }
    console.log("Validated product data:", value);

    const product = new Product(value);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    console.log("Received product update data:", req.body);
    const { error, value } = productUpdateSchema.validate(req.body);
    if (error) {
      console.error(
        "Product update validation error:",
        error.details[0].message,
      );
      return res.status(400).json({ error: error.details[0].message });
    }
    console.log("Validated product update data:", value);

    const product = await Product.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await Product.find({}).sort({ name: 1 });
    res.json({ items });
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
