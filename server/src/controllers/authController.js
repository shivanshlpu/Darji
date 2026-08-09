import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Measurement from '../models/Measurement.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'darji_erp_secret_key_2026_secure_jwt', {
    expiresIn: process.env.JWT_EXPIRES_IN || '3650d',
  });
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    let user = await User.findOne({ phone }).populate('shopId');

    if (!user) {
      // Auto seed on first login if database is fresh
      await seedDefaultData();
      user = await User.findOne({ phone }).populate('shopId');
    }

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      user.lastLoginAt = new Date();
      await user.save();

      return res.json({
        success: true,
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          shopId: user.shopId._id,
          shopName: user.shopId.name,
        },
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid phone or password' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect!' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully in database!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const seedDefaultData = async () => {
  const existingShop = await Shop.findOne();
  if (existingShop) return existingShop;

  console.log('🌱 Seeding initial MongoDB Atlas demo data...');
  const shop = await Shop.create({
    name: 'Darji Premium Tailors',
    gstNumber: '24AAACD1234E1Z9',
    phone: '+91 99999 99999',
    email: 'admin@darjitailors.com',
    address: '102, Fashion Market, MG Road, Surat - 395003',
  });

  const salt = await bcrypt.genSalt(10);
  const ownerHash = await bcrypt.hash('darji123', salt);
  const staffHash = await bcrypt.hash('staff123', salt);

  await User.create([
    {
      shopId: shop._id,
      name: 'Rajesh Darji',
      phone: '9999999999',
      email: 'rajesh@darjitailors.com',
      passwordHash: ownerHash,
      role: 'owner',
      permissions: ['all'],
    },
    {
      shopId: shop._id,
      name: 'Sunil Kumar',
      phone: '8888888888',
      email: 'sunil@darjitailors.com',
      passwordHash: staffHash,
      role: 'staff',
      permissions: ['customers', 'measurements', 'orders', 'payments'],
    },
  ]);

  // Seed Customers
  const c1 = await Customer.create({
    shopId: shop._id,
    name: 'Rahul Sharma',
    mobile: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    address: '12, MG Road, Surat',
    gender: 'male',
    totalSpending: 45000,
    pendingAmount: 5000,
    tags: ['VIP', 'Regular'],
  });

  const c2 = await Customer.create({
    shopId: shop._id,
    name: 'Priya Patel',
    mobile: '+91 91234 56789',
    whatsapp: '+91 91234 56789',
    address: '45, Station Road, Surat',
    gender: 'female',
    totalSpending: 68000,
    pendingAmount: 0,
    tags: ['Wedding'],
  });

  // Seed Measurements
  await Measurement.create({
    shopId: shop._id,
    customerId: c1._id,
    category: 'shirt',
    fields: { chest: 40, waist: 34, shoulder: 17.5, sleeveLength: 25, neckRound: 15.5 },
    version: 1,
    recordedBy: 'Rajesh Darji',
  });

  // Seed Orders
  await Order.create([
    {
      shopId: shop._id,
      orderNumber: 'ORD-2026-000001',
      customerId: c1._id,
      customerName: c1.name,
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: 'urgent',
      status: 'stitching',
      items: [{ name: '3-Piece Suit', category: 'suit', qty: 1, price: 12500, notes: 'Silk lining' }],
      subtotal: 12500,
      paidAmount: 7500,
      pendingAmount: 5000,
      paymentStatus: 'partial',
      timeline: [
        { status: 'pending', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedBy: 'Admin' },
        { status: 'cutting', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedBy: 'Admin' },
        { status: 'stitching', timestamp: new Date(), updatedBy: 'Admin' },
      ],
    },
    {
      shopId: shop._id,
      orderNumber: 'ORD-2026-000002',
      customerId: c2._id,
      customerName: c2.name,
      deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      priority: 'vip',
      status: 'cutting',
      items: [{ name: 'Bridal Lehenga', category: 'lehenga', qty: 1, price: 35000, notes: 'Heavy embroidery' }],
      subtotal: 35000,
      paidAmount: 35000,
      pendingAmount: 0,
      paymentStatus: 'paid',
      timeline: [{ status: 'pending', timestamp: new Date(), updatedBy: 'Admin' }],
    },
  ]);

  // Seed Expenses
  const todayStr = new Date().toISOString().slice(0, 10);
  await Expense.create([
    {
      shopId: shop._id,
      date: todayStr,
      category: 'shop',
      description: 'Monthly shop rent',
      amount: 15000,
      paymentMode: 'bankTransfer',
      isRecurringMonthly: true,
    },
    {
      shopId: shop._id,
      date: todayStr,
      category: 'material',
      description: 'Italian Silk Fabric Roll',
      amount: 8500,
      paymentMode: 'upi',
    },
  ]);

  console.log('✅ Default seed completed!');
  return shop;
};
