import { Invoice } from '../models';

export const generateInvoiceNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}${month}`;

  // Find the latest invoice number for this month
  const latestInvoice = await Invoice.findOne({
    number: { $regex: `^${prefix}-` }
  }).sort({ number: -1 });

  let sequence = 1;
  if (latestInvoice) {
    const parts = latestInvoice.number.split('-');
    if (parts.length === 2) {
      sequence = parseInt(parts[1]) + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};
