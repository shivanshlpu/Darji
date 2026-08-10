import { clearEntryData } from '../scripts/clearEntryData.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Measurement from '../models/Measurement.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Cashbook from '../models/Cashbook.js';
import Shop from '../models/Shop.js';

export const handleClearEntryData = async (req, res) => {
  try {
    const summary = await clearEntryData();
    res.status(200).json({
      success: true,
      message: 'All app entry data cleared successfully!',
      summary,
    });
  } catch (error) {
    console.error('Error clearing app entry data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear app entry data',
    });
  }
};

export const generateFullDatabaseBackup = async (req, res) => {
  try {
    const shop = await Shop.findOne({});
    const customers = await Customer.find({ isDeleted: false });
    const orders = await Order.find({ isDeleted: false });
    const measurements = await Measurement.find({ isDeleted: false });
    const payments = await Payment.find({});
    const expenses = await Expense.find({ isDeleted: false });
    const cashbook = await Cashbook.find({});

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      shopInfo: shop,
      stats: {
        totalCustomers: customers.length,
        totalOrders: orders.length,
        totalMeasurements: measurements.length,
        totalPayments: payments.length,
        totalExpenses: expenses.length,
      },
      data: {
        customers,
        orders,
        measurements,
        payments,
        expenses,
        cashbook,
      },
    };

    if (shop) {
      shop.lastBackupAt = new Date();
      await shop.save();
    }

    res.json({
      success: true,
      message: 'Encrypted database backup generated successfully!',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      backup: backupData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
