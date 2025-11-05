import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { IssueSummary, IssueTxn, Product, Client, StockLedger } from '../models';

// POST /api/issue/from-invoice - Called when invoice is finalized
export const createIssueFromInvoice: RequestHandler = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { invoiceId, clientId, items } = req.body;
      
      if (!clientId || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Client ID and items array are required' });
      }

      for (const item of items) {
        const { productId, qty } = item;
        
        if (!productId || !qty || qty <= 0) {
          return res.status(400).json({ error: 'Valid product ID and quantity required for all items' });
        }

        // Update or create IssueSummary
        await IssueSummary.findOneAndUpdate(
          { clientId, productId },
          {
            $inc: { 
              issued: qty,
              remaining: qty
            },
            $set: { updatedAt: new Date() }
          },
          { 
            upsert: true, 
            new: true, 
            session 
          }
        );

        // Create IssueTxn record
        await IssueTxn.create([{
          clientId,
          productId,
          qty,
          type: 'issue',
          ref: `Invoice ${invoiceId}`,
          at: new Date()
        }], { session });

        // Update product stock (decrease)
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }

        if (product.stock < qty) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: -qty } },
          { session }
        );

        // Create stock ledger entry
        await StockLedger.create([{
          productId,
          type: 'issue',
          quantity: qty,
          remainingStock: product.stock - qty,
          invoiceId,
          note: `Issued to client via invoice ${invoiceId}`,
          date: new Date()
        }], { session });
      }
    });

    res.json({ success: true, message: 'Items issued successfully' });
  } catch (error: any) {
    console.error('Error creating issue from invoice:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    await session.endSession();
  }
};

// POST /api/issue/return - Return items
export const returnItems: RequestHandler = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { clientId, productId, qty, note } = req.body;
      
      if (!clientId || !productId || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Client ID, product ID, and valid quantity are required' });
      }

      // Check current issue summary
      const issueSummary = await IssueSummary.findOne({ clientId, productId }).session(session);
      
      if (!issueSummary) {
        return res.status(400).json({ error: 'No issued items found for this client and product' });
      }

      if (issueSummary.remaining < qty) {
        return res.status(400).json({ 
          error: `Cannot return ${qty} items. Only ${issueSummary.remaining} items remaining.` 
        });
      }

      // Update IssueSummary
      await IssueSummary.findOneAndUpdate(
        { clientId, productId },
        {
          $inc: { 
            returned: qty,
            remaining: -qty
          },
          $set: { updatedAt: new Date() }
        },
        { session }
      );

      // Create IssueTxn record
      await IssueTxn.create([{
        clientId,
        productId,
        qty,
        type: 'return',
        ref: note || 'Manual return',
        at: new Date()
      }], { session });

      // Update product stock (increase)
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: qty } },
        { new: true, session }
      );

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Create stock ledger entry
      await StockLedger.create([{
        productId,
        type: 'return',
        quantity: qty,
        remainingStock: product.stock,
        note: `Returned by client: ${note || 'Manual return'}`,
        date: new Date()
      }], { session });
    });

    res.json({ success: true, message: 'Items returned successfully' });
  } catch (error: any) {
    console.error('Error returning items:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    await session.endSession();
  }
};

// GET /api/issue/summary?clientId=... - Get issue summary per product
export const getIssueSummary: RequestHandler = async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const summaries = await IssueSummary.find({ clientId })
      .populate('productId', 'name category')
      .populate('clientId', 'name')
      .sort({ updatedAt: -1 });

    const result = summaries.map(summary => ({
      productId: summary.productId._id,
      name: summary.productId.name,
      category: summary.productId.category,
      issued: summary.issued,
      returned: summary.returned,
      remaining: summary.remaining,
      updatedAt: summary.updatedAt
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Error getting issue summary:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// GET /api/issue/history?clientId=...&productId=... - Get transaction history
export const getIssueHistory: RequestHandler = async (req, res) => {
  try {
    const { clientId, productId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const query: any = { clientId };
    if (productId) {
      query.productId = productId;
    }

    const transactions = await IssueTxn.find(query)
      .populate('productId', 'name category')
      .populate('clientId', 'name')
      .sort({ at: -1 });

    const result = transactions.map(txn => ({
      id: txn._id,
      productName: txn.productId.name,
      productCategory: txn.productId.category,
      qty: txn.qty,
      type: txn.type,
      ref: txn.ref,
      at: txn.at,
      createdAt: txn.createdAt
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Error getting issue history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
