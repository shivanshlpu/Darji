import Counter from '../models/Counter.js';
import Shop from '../models/Shop.js';

export const generateNextInvoiceNumber = async (shopId) => {
  const shop = await Shop.findById(shopId);
  const settings = shop?.invoiceSettings || { prefix: 'INV', resetCycle: 'yearly', padding: 6 };

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const periodKey = settings.resetCycle === 'monthly' ? `${year}-${month}` : `${year}`;

  const counter = await Counter.findOneAndUpdate(
    { shopId, periodKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedNum = String(counter.seq).padStart(settings.padding, '0');
  return `${settings.prefix}-${periodKey}-${paddedNum}`;
};
