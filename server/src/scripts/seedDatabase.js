import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Fix Windows SRV DNS resolution for MongoDB Atlas
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import Shop from '../models/Shop.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Measurement from '../models/Measurement.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Cashbook from '../models/Cashbook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Sample High-Quality Compressed SVG Logos and Signatures as DataURLs for Database Seeding
const SAMPLE_SHOP_LOGO = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='%230B1F3A'/><path d='M28 62 L72 62 C73 62 74 61 74 60 L74 58 C74 57 73 56 72 56 L36 56 C36 48 38 42 46 40 L66 40 C69 40 70 38 70 35 C70 32 68 30 65 30 L38 30 C28 30 25 38 25 48 L25 60 C25 61 26 62 28 62 Z' fill='%23C9A24B'/><circle cx='67' cy='35' r='7' fill='none' stroke='%23C9A24B' stroke-width='2.5'/><circle cx='67' cy='35' r='2.5' fill='%23C9A24B'/><text x='50' y='78' font-family='sans-serif' font-weight='900' font-size='12' fill='%23FFFFFF' text-anchor='middle'>DARJI</text></svg>`;

const SAMPLE_SIGNATURE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><path d='M 10 40 Q 30 10, 50 35 T 90 20 T 130 40 Q 150 15, 180 30' stroke='%2316305A' stroke-width='3.5' fill='none' stroke-linecap='round'/><text x='20' y='52' font-family='sans-serif' font-weight='bold' font-size='14' fill='%23C9A24B'>Shivansh</text></svg>`;

const SAMPLE_CUSTOMER_PHOTO = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2316305A'/><circle cx='50' cy='38' r='20' fill='%23C9A24B'/><path d='M 20 88 C 20 68, 35 60, 50 60 C 65 60, 80 68, 80 88 Z' fill='%23C9A24B'/></svg>`;

export async function runSeed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI missing in environment');
    process.exit(1);
  }

  console.log('📡 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas!');

  // Clear existing collections for a clean seed
  await Promise.all([
    Shop.deleteMany({}),
    User.deleteMany({}),
    Customer.deleteMany({}),
    Measurement.deleteMany({}),
    Order.deleteMany({}),
    Expense.deleteMany({}),
    Cashbook.deleteMany({}),
  ]);
  console.log('🧹 Existing test collections cleaned.');

  // 1. Create Shop Profile with uploaded logo & signature stored in MongoDB
  const shop = await Shop.create({
    name: 'Darji',
    logoUrl: SAMPLE_SHOP_LOGO,
    signatureUrl: SAMPLE_SIGNATURE,
    gstNumber: '24AAACD1234E1Z9',
    phone: '+91 90091 49694',
    email: 'darji.tailoring@gmail.com',
    address: '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
    currency: 'INR',
    termsAndConditions: [
      '1. Garments not collected within 30 days are not the responsibility of the shop.',
      '2. Alterations are accepted within 7 days of delivery upon presentation of original bill.',
      '3. Subject to Shahdol local jurisdiction only.',
      '4. WhatsApp notification sent once job is ready for pickup.',
    ],
  });
  console.log('🏢 Shop Created in DB:', shop.name, `(_id: ${shop._id})`);

  // 2. Create User Accounts (Target credentials loaded securely from environment)
  const targetPhone = process.env.ADMIN_PHONE || '9000000000';
  const targetPass = process.env.ADMIN_PASSWORD || 'default_pass_123';

  const salt = await bcrypt.genSalt(10);
  const userPasswordHash = await bcrypt.hash(targetPass, salt);
  const defaultPasswordHash = await bcrypt.hash('darji123', salt);

  const mainUser = await User.create({
    shopId: shop._id,
    name: 'Shivansh Darji',
    phone: targetPhone,
    email: 'shivansh@darji.com',
    passwordHash: userPasswordHash,
    role: 'owner',
    permissions: ['all'],
  });

  const demoUser = await User.create({
    shopId: shop._id,
    name: 'Rajesh Owner',
    phone: '9999999999',
    email: 'admin@darji.com',
    passwordHash: defaultPasswordHash,
    role: 'owner',
    permissions: ['all'],
  });

  console.log('👤 Primary User Created in DB:', mainUser.name, `(Phone: ${mainUser.phone}, Password: [PROTECTED FROM ENV])`);

  // 3. Create Customers (with photos, mobile, address, pending amounts, tags)
  const customers = await Customer.create([
    {
      shopId: shop._id,
      name: 'SWATI PATEL',
      mobile: '9691484804',
      whatsapp: '9691484804',
      address: '219, GANDHI NAGAR, RAJKOT',
      gender: 'female',
      photoUrl: SAMPLE_CUSTOMER_PHOTO,
      totalSpending: 28500,
      pendingAmount: 12500,
      tags: ['VIP', 'Wedding'],
    },
    {
      shopId: shop._id,
      name: 'KARAN GUPTA',
      mobile: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      address: 'MEDICAL COLLEGE SHAHDOL',
      gender: 'male',
      photoUrl: SAMPLE_CUSTOMER_PHOTO,
      totalSpending: 51941,
      pendingAmount: 8000,
      tags: ['Regular', 'Wedding'],
    },
    {
      shopId: shop._id,
      name: 'RAHUL SHARMA',
      mobile: '9876543210',
      whatsapp: '9876543210',
      address: '12, MG ROAD, SHAHDOL',
      gender: 'male',
      totalSpending: 45000,
      pendingAmount: 5000,
      tags: ['VIP', 'Regular'],
    },
    {
      shopId: shop._id,
      name: 'PRIYA PATEL',
      mobile: '9123456789',
      whatsapp: '9123456789',
      address: '45, STATION ROAD, SHAHDOL',
      gender: 'female',
      totalSpending: 68000,
      pendingAmount: 0,
      tags: ['Wedding'],
    },
  ]);
  console.log(`👨‍👩‍👧 ${customers.length} Customers Created in DB.`);

  // 4. Create Measurements
  await Measurement.create([
    {
      shopId: shop._id,
      customerId: customers[0]._id,
      category: 'lehenga',
      fields: { blouseLength: 15, bust: 36, waist: 30, shoulder: 14, neckFront: 7.5, neckBack: 9, lehengaLength: 42, waistLehenga: 32 },
      version: 1,
      recordedBy: 'Shivansh Darji',
    },
    {
      shopId: shop._id,
      customerId: customers[1]._id,
      category: 'shirt',
      fields: { chest: 42, waist: 36, shoulder: 18, sleeveLength: 26, neckRound: 16, shirtLength: 30 },
      version: 1,
      recordedBy: 'Shivansh Darji',
    },
    {
      shopId: shop._id,
      customerId: customers[1]._id,
      category: 'pant',
      fields: { waist: 36, hip: 42, length: 41, inseam: 31, bottomRound: 15, thigh: 26 },
      version: 1,
      recordedBy: 'Shivansh Darji',
    },
  ]);
  console.log('📏 Customer Measurements Created in DB.');

  // 5. Create Orders
  const orders = await Order.create([
    {
      shopId: shop._id,
      orderNumber: 'ORD-2026-000047',
      tokenNumber: 'T-101',
      customerId: customers[0]._id,
      customerName: customers[0].name,
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      priority: 'vip',
      status: 'stitching',
      items: [
        { name: 'DESIGNER SHIRT', category: 'shirt', qty: 3, price: 5333, notes: 'Slim fit, double cuff' },
        { name: 'DESIGNER SAREE BLOUSE', category: 'sareeBlouse', qty: 3, price: 6556, notes: 'Padded with piping' },
        { name: 'PARTY LEHENGA', category: 'lehenga', qty: 1, price: 8351, notes: 'Heavy dupatta embroidery' },
      ],
      subtotal: 44018,
      paidAmount: 31518,
      pendingAmount: 12500,
      paymentStatus: 'partial',
      timeline: [
        { status: 'pending', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedBy: 'Shivansh' },
        { status: 'cutting', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedBy: 'Shivansh' },
        { status: 'stitching', timestamp: new Date(), updatedBy: 'Shivansh' },
      ],
    },
    {
      shopId: shop._id,
      orderNumber: 'ORD-2026-000048',
      tokenNumber: 'T-102',
      customerId: customers[1]._id,
      customerName: customers[1].name,
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      deliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      priority: 'urgent',
      status: 'cutting',
      items: [
        { name: '3-PIECE SUIT', category: 'suit', qty: 1, price: 18500, notes: 'Italian Navy Wool' },
        { name: 'CUSTOM KURTA PAJAMA', category: 'kurta', qty: 2, price: 3500, notes: 'Cotton Linen' },
      ],
      subtotal: 25500,
      paidAmount: 17500,
      pendingAmount: 8000,
      paymentStatus: 'partial',
      timeline: [
        { status: 'pending', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedBy: 'Shivansh' },
        { status: 'cutting', timestamp: new Date(), updatedBy: 'Shivansh' },
      ],
    },
  ]);
  console.log(`📦 ${orders.length} Orders Created in DB.`);

  // 6. Create Expenses
  const todayStr = new Date().toISOString().slice(0, 10);
  await Expense.create([
    {
      shopId: shop._id,
      date: todayStr,
      category: 'material',
      description: 'Premium Blazer Lining & Buttons Roll',
      amount: 4200,
      paymentMode: 'upi',
    },
    {
      shopId: shop._id,
      date: todayStr,
      category: 'shop',
      description: 'Steam Iron Electricity & Machine Oil',
      amount: 1800,
      paymentMode: 'cash',
    },
  ]);
  console.log('💸 Expenses Created in DB.');

  // 7. Create Cashbook Record
  await Cashbook.create({
    shopId: shop._id,
    date: todayStr,
    openingCash: 12500,
    cashSales: 18500,
    onlineSales: 13000,
    totalExpenses: 1800,
    closingCashExpected: 29200,
    closingCashActual: 29200,
    mismatch: 0,
  });
  console.log('📖 Cashbook Record Created in DB.');

  console.log('\n========================================');
  console.log('🎉 DATABASE SEED COMPLETE & VERIFIED!');
  console.log('========================================');
  console.log('📋 MONGO DB COLLECTIONS VERIFICATION:');
  console.log(' - Shops:', await Shop.countDocuments());
  console.log(' - Users:', await User.countDocuments());
  console.log(' - Customers:', await Customer.countDocuments());
  console.log(' - Measurements:', await Measurement.countDocuments());
  console.log(' - Orders:', await Order.countDocuments());
  console.log(' - Expenses:', await Expense.countDocuments());
  console.log(' - Cashbook Records:', await Cashbook.countDocuments());
  console.log('========================================');
  console.log('🔑 TARGET LOGIN CREDENTIALS:');
  console.log('   Phone:    Loaded from ADMIN_PHONE in .env');
  console.log('   Password: Loaded from ADMIN_PASSWORD in .env');
  console.log('========================================\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB Atlas.');
}

if (process.argv[1] && process.argv[1].includes('seedDatabase')) {
  runSeed().catch(err => {
    console.error('❌ SEED ERROR:', err);
    process.exit(1);
  });
}
