import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Fix Windows SRV DNS resolution for MongoDB Atlas if needed
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import Customer from '../models/Customer.js';
import Measurement from '../models/Measurement.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Cashbook from '../models/Cashbook.js';
import AuditLog from '../models/AuditLog.js';
import WhatsappLog from '../models/WhatsappLog.js';
import Counter from '../models/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export async function clearEntryData(options = { preserveShopAndUser: true }) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI missing in environment');
  }

  if (mongoose.connection.readyState === 0) {
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB Atlas!');
  }

  console.log('🧹 Clearing entry data from database...');

  const results = await Promise.all([
    Customer.deleteMany({}),
    Measurement.deleteMany({}),
    Order.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    Cashbook.deleteMany({}),
    AuditLog.deleteMany({}),
    WhatsappLog.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const summary = {
    customersDeleted: results[0].deletedCount,
    measurementsDeleted: results[1].deletedCount,
    ordersDeleted: results[2].deletedCount,
    invoicesDeleted: results[3].deletedCount,
    paymentsDeleted: results[4].deletedCount,
    expensesDeleted: results[5].deletedCount,
    cashbooksDeleted: results[6].deletedCount,
    auditLogsDeleted: results[7].deletedCount,
    whatsappLogsDeleted: results[8].deletedCount,
    countersReset: results[9].deletedCount,
  };

  console.log('✨ Entry Data Cleared Successfully!');
  console.table(summary);
  return summary;
}

// Execute if called directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  clearEntryData()
    .then(() => {
      console.log('🎉 Cleanup script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error clearing entry data:', err);
      process.exit(1);
    });
}
