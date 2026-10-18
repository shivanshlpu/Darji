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

/**
 * Enforces that only the designated single owner ID remains active with all data preserved.
 */
export const ensureSingleActiveAdmin = async () => {
  try {
    const targetAdminPhone = process.env.ADMIN_PHONE ? String(process.env.ADMIN_PHONE).replace(/\D/g, '').slice(-10) : '9479487828';
    // Pre-computed Bcrypt hash for default owner password (non-plaintext, non-reversible)
    const DEFAULT_OWNER_BCRYPT = '$2a$10$JWbvM0k7IeAvR15VLLGBy.yc128rCINt6KdIiA18EPf.gmKu208Du';

    // Find the owner user
    let owner = await User.findOne({ role: 'owner' });
    if (!owner) {
      owner = await User.findOne({});
    }

    if (owner) {
      let needsSave = false;
      if (owner.phone !== targetAdminPhone) {
        owner.phone = targetAdminPhone;
        needsSave = true;
      }
      if (owner.role !== 'owner') {
        owner.role = 'owner';
        needsSave = true;
      }
      if (!owner.isActive) {
        owner.isActive = true;
        needsSave = true;
      }
      if (!owner.passwordHash) {
        owner.passwordHash = DEFAULT_OWNER_BCRYPT;
        needsSave = true;
      }
      if (needsSave) {
        await owner.save();
        console.log(`🔒 [Security] Single active owner credentials secured for ${targetAdminPhone}`);
      }

      // Ensure any other accounts are deactivated so ONLY this single ID remains active
      await User.updateMany(
        { _id: { $ne: owner._id } },
        { $set: { isActive: false } }
      );
    }
  } catch (err) {
    console.error('⚠️ [Security] Failed to ensure single active admin:', err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    const digits = String(phone || '').replace(/\D/g, '').slice(-10);
    const targetAdminPhone = process.env.ADMIN_PHONE ? String(process.env.ADMIN_PHONE).replace(/\D/g, '').slice(-10) : '9479487828';

    // Strict check: Only the designated mobile number is permitted
    if (digits !== targetAdminPhone) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    const user = await User.findOne({
      $or: [
        { phone: digits },
        { phone: `+91${digits}` },
        { phone: `+91 ${digits}` },
      ],
      isActive: { $ne: false },
    }).populate('shopId');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

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
        shopId: user.shopId?._id || user.shopId,
        shopName: user.shopId?.name || 'Darji Premium Tailors',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An error occurred during authentication' });
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

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

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const seedDefaultData = async () => {
  const existingShop = await Shop.findOne();
  if (existingShop) return existingShop;

  const defaultPhone = process.env.ADMIN_PHONE || '9479487828';
  // Irreversible pre-computed Bcrypt hash for owner password (safe for public git)
  const PRECOMPUTED_OWNER_BCRYPT = '$2a$10$JWbvM0k7IeAvR15VLLGBy.yc128rCINt6KdIiA18EPf.gmKu208Du';

  console.log('🌱 Seeding initial MongoDB Atlas demo data...');
  const shop = await Shop.create({
    name: 'Darji Premium Tailors',
    gstNumber: '24AAACD1234E1Z9',
    phone: `+91 ${defaultPhone}`,
    email: 'admin@darjitailors.com',
    address: '102, Fashion Market, MG Road, Surat - 395003',
  });

  const salt = await bcrypt.genSalt(10);
  const ownerHash = PRECOMPUTED_OWNER_BCRYPT;
  const staffHash = await bcrypt.hash('staff123', salt);

  await User.create([
    {
      shopId: shop._id,
      name: 'Arunav Darji',
      phone: defaultPhone,
      email: 'arunav@darjitailors.com',
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
