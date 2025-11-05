import { Response } from 'express';
import { Invoice, Product, Client, Worker } from '../models';
import { AuthRequest } from '../utils/auth';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { range = 'today', from, to } = req.query;
    
    let startDate: Date;
    let endDate: Date = new Date();
    
    switch (range) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        if (from && to) {
          startDate = new Date(from as string);
          endDate = new Date(to as string);
        } else {
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
        }
    }

    // Get invoices in date range
    const invoices = await Invoice.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'final'
    }).populate('items.productId');

    const returnedInvoices = await Invoice.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'returned'
    }).populate('items.productId');

    // Calculate totals
    let totalSales = 0;
    let totalReturns = 0;
    let totalProfit = 0;
    let totalInvoices = invoices.length;

    invoices.forEach(invoice => {
      totalSales += invoice.totals.grandTotal;
      
      // Calculate profit for each item
      invoice.items.forEach(item => {
        const product = item.productId as any;
        if (product && product.buyPrice) {
          const profit = (item.rate - product.buyPrice) * item.qty;
          totalProfit += profit;
        }
      });
    });

    returnedInvoices.forEach(invoice => {
      totalReturns += invoice.totals.grandTotal;
      
      // Subtract returned profit
      invoice.items.forEach(item => {
        const product = item.productId as any;
        if (product && product.buyPrice) {
          const profit = (item.rate - product.buyPrice) * item.qty;
          totalProfit -= profit;
        }
      });
    });

    const netRevenue = totalSales - totalReturns;
    const netProfit = totalProfit;

    // Get low stock products (stock < 10)
    const lowStockProducts = await Product.find({ stockQty: { $lt: 10 } }).limit(5);

    // Get total counts
    const totalProducts = await Product.countDocuments();
    const totalClients = await Client.countDocuments();
    const totalWorkers = await Worker.countDocuments();

    // Get recent invoices
    const allRecentInvoices = await Invoice.find({ clientId: { $ne: null } })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .limit(10); // Get more to account for filtering

    // Filter out invoices where clientId population failed
    const recentInvoices = allRecentInvoices
      .filter(invoice => invoice.clientId && typeof invoice.clientId === 'object')
      .slice(0, 5);

    // Get top selling products
    const topProducts = await Invoice.aggregate([
      { $match: { status: 'final', date: { $gte: startDate, $lte: endDate } } },
      { $unwind: '$items' },
      { 
        $group: {
          _id: '$items.productId',
          totalQty: { $sum: '$items.qty' },
          totalRevenue: { $sum: { $multiply: ['$items.qty', '$items.rate'] } }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Time series data for charts (last 7 days)
    const chartStartDate = new Date();
    chartStartDate.setDate(chartStartDate.getDate() - 7);
    
    const dailySales = await Invoice.aggregate([
      { 
        $match: { 
          status: 'final',
          date: { $gte: chartStartDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          sales: { $sum: '$totals.grandTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      summary: {
        totalSales,
        totalReturns,
        netRevenue,
        netProfit,
        totalInvoices,
        totalProducts,
        totalClients,
        totalWorkers
      },
      lowStockProducts,
      recentInvoices,
      topProducts,
      dailySales,
      dateRange: {
        startDate,
        endDate,
        range
      }
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientReport = async (req: AuthRequest, res: Response) => {
  try {
    const clientReports = await Invoice.aggregate([
      { $match: { status: 'final' } },
      {
        $group: {
          _id: '$clientId',
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totals.grandTotal' },
          totalPaid: { $sum: '$totals.paid' },
          totalPending: { $sum: '$totals.pending' }
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(clientReports);
  } catch (error) {
    console.error('Get client report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductReport = async (req: AuthRequest, res: Response) => {
  try {
    const productReports = await Invoice.aggregate([
      { $match: { status: 'final' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQtySold: { $sum: '$items.qty' },
          totalRevenue: { $sum: { $multiply: ['$items.qty', '$items.rate'] } },
          avgRate: { $avg: '$items.rate' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $addFields: {
          totalProfit: {
            $multiply: [
              '$totalQtySold',
              { $subtract: ['$avgRate', '$product.buyPrice'] }
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json(productReports);
  } catch (error) {
    console.error('Get product report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyData = await Invoice.aggregate([
      {
        $match: {
          status: 'final',
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          sales: { $sum: '$totals.grandTotal' },
          invoiceCount: { $sum: 1 },
          avgInvoiceValue: { $avg: '$totals.grandTotal' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    res.json(monthlyData);
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTimeseries = async (req: AuthRequest, res: Response) => {
  try {
    const { gran = 'day', from, to } = req.query;

    let startDate: Date;
    let endDate: Date = new Date();
    let dateFormat: string;
    let sortBy: string;

    // Set date format based on granularity
    switch (gran) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        break;
      case 'week':
        dateFormat = '%Y-%U'; // Year-Week
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 12 * 7); // Last 12 weeks
        break;
      case 'month':
        dateFormat = '%Y-%m';
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        break;
      default:
        dateFormat = '%Y-%m-%d';
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }

    // Override with custom dates if provided
    if (from) startDate = new Date(from as string);
    if (to) endDate = new Date(to as string);

    const timeseries = await Invoice.aggregate([
      {
        $match: {
          status: 'final',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$date' } },
          sales: { $sum: '$totals.grandTotal' },
          invoices: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          x: '$_id',
          sales: 1,
          invoices: 1,
          profit: 0 // Will be calculated separately if product data needed
        }
      }
    ]);

    // Calculate profit for each time period
    const timeseriesWithProfit = await Promise.all(
      timeseries.map(async (period) => {
        const periodStart = new Date(period.x);
        let periodEnd = new Date(periodStart);

        // Set period end based on granularity
        switch (gran) {
          case 'day':
            periodEnd.setDate(periodEnd.getDate() + 1);
            break;
          case 'week':
            periodEnd.setDate(periodEnd.getDate() + 7);
            break;
          case 'month':
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            break;
        }

        const invoices = await Invoice.find({
          status: 'final',
          date: { $gte: periodStart, $lt: periodEnd }
        }).populate('items.productId');

        let totalProfit = 0;
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            const product = item.productId as any;
            if (product && product.buyPrice) {
              const profit = (item.rate - product.buyPrice) * item.qty;
              totalProfit += profit;
            }
          });
        });

        return {
          ...period,
          profit: totalProfit
        };
      })
    );

    res.json(timeseriesWithProfit);
  } catch (error) {
    console.error('Get timeseries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
