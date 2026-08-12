import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Measurement from '../models/Measurement.js';
import Shop from '../models/Shop.js';
import { sendWhatsappMessage } from '../services/whatsapp.service.js';

const ALLOWED_TRANSITIONS = {
  pending: ['preparing', 'cutting', 'stitching', 'trial', 'ready', 'completed', 'delivered', 'cancelled'],
  preparing: ['ready', 'completed', 'delivered', 'cancelled'],
  cutting: ['stitching', 'preparing', 'ready', 'completed', 'delivered', 'cancelled'],
  stitching: ['trial', 'preparing', 'ready', 'completed', 'delivered', 'cancelled'],
  trial: ['ready', 'completed', 'delivered', 'cancelled'],
  ready: ['completed', 'delivered', 'cancelled'],
  completed: [],
  delivered: [],
  cancelled: [],
};

async function findOrderByIdOrNumber(idParam) {
  if (!idParam) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(idParam);
  let order = null;
  if (isObjectId) {
    order = await Order.findOne({ _id: idParam, isDeleted: false });
  }
  if (!order) {
    order = await Order.findOne({ orderNumber: idParam, isDeleted: false });
  }
  if (!order) {
    order = await Order.findOne({ tokenNumber: idParam, isDeleted: false });
  }
  return order;
}

export const getOrders = async (req, res) => {
  try {
    const { status, paymentStatus, customerId } = req.query;
    const query = { isDeleted: false };
    if (req.shopId) query.shopId = req.shopId;

    if (status && status !== 'all') {
      if (status === 'completed') {
        query.status = { $in: ['completed', 'delivered'] };
      } else if (status === 'preparing') {
        query.status = { $in: ['preparing', 'cutting', 'stitching', 'trial'] };
      } else {
        query.status = status;
      }
    }
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (customerId) query.customerId = customerId;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id;

    // 1. Resolve Shop ID
    let shopId = req.shopId;
    if (!shopId || !mongoose.Types.ObjectId.isValid(shopId)) {
      const activeShop = await Shop.findOne({});
      if (activeShop) {
        shopId = activeShop._id;
      } else {
        const newShop = await Shop.create({
          name: 'Darji Premium Tailors',
          phone: '+91 99999 99999',
          email: 'admin@darjitailors.com',
          address: 'Surat, Gujarat',
        });
        shopId = newShop._id;
      }
    }

    // 2. Resolve Customer ID
    let customerId = body.customerId;
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      const rawMobile = body.customerMobile || '';
      const cleanDigits = String(rawMobile).replace(/\D/g, '').slice(-10);
      let cust = null;
      if (cleanDigits) {
        cust = await Customer.findOne({
          mobile: { $regex: cleanDigits },
          isDeleted: false,
        });
      }
      if (!cust) {
        cust = await Customer.create({
          shopId,
          name: body.customerName || 'Customer',
          mobile: rawMobile || (cleanDigits ? `+91 ${cleanDigits}` : '9000000000'),
          address: body.customerAddress || '',
        });
      }
      customerId = cust._id;
    }

    // 3. Resolve Unique Order Number & Token Number (Avoid duplicate key errors)
    let orderNumber = body.orderNumber;
    if (orderNumber) {
      const existing = await Order.findOne({ orderNumber, isDeleted: false });
      if (existing) orderNumber = null;
    }

    if (!orderNumber) {
      const count = await Order.countDocuments({});
      let seq = count + 1;
      orderNumber = `ORD-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;
      let exists = await Order.findOne({ orderNumber });
      while (exists) {
        seq++;
        orderNumber = `ORD-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;
        exists = await Order.findOne({ orderNumber });
      }
    }

    let tokenNumber = body.tokenNumber;
    if (!tokenNumber) {
      const count = await Order.countDocuments({});
      tokenNumber = `T-${101 + count}`;
    }

    // 4. Sanitize Items Payload
    const items = Array.isArray(body.items) && body.items.length > 0
      ? body.items.map(it => ({
          name: it.name || 'Custom Garment',
          category: it.category || 'topWear',
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
          notes: it.notes || '',
          measurements: typeof it.measurements === 'object' && it.measurements ? it.measurements : {},
        }))
      : [{ name: 'Custom Suit', category: 'topWear', qty: 1, price: 1200, notes: '', measurements: {} }];

    const subtotal = Number(body.subtotal) || items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discount = Number(body.discount) || 0;
    const discountType = body.discountType || 'amount';
    const discountValue = Number(body.discountValue) || discount;
    const extraCharges = Number(body.extraCharges) || 0;
    const grandTotal = Math.max(0, subtotal - discount + extraCharges);
    const paidAmount = Number(body.paidAmount !== undefined ? body.paidAmount : body.advancePaid) || 0;
    const pendingAmount = Math.max(0, grandTotal - paidAmount);
    const paymentStatus = pendingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    const delDate = body.deliveryDate ? new Date(body.deliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const order = await Order.create({
      shopId,
      orderNumber,
      tokenNumber,
      customerId,
      customerName: body.customerName || 'Customer',
      customerMobile: body.customerMobile || '',
      deliveryDate: delDate,
      priority: body.priority || 'normal',
      status: body.status || 'pending',
      items,
      notes: body.notes || '',
      subtotal,
      discount,
      discountType,
      discountValue,
      extraCharges,
      grandTotal,
      totalAmount: grandTotal,
      paidAmount,
      advancePaid: paidAmount,
      pendingAmount,
      balanceDue: pendingAmount,
      paymentStatus,
      timeline: [{ status: 'pending', timestamp: new Date(), updatedBy: 'Owner' }],
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[Order Create Error]:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const items = req.body.items || order.items;
    const subtotal = req.body.subtotal !== undefined ? Number(req.body.subtotal) : items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0);
    const discount = req.body.discount !== undefined ? Number(req.body.discount) : (order.discount || 0);
    const discountType = req.body.discountType || order.discountType || 'amount';
    const discountValue = req.body.discountValue !== undefined ? Number(req.body.discountValue) : (order.discountValue || discount);
    const extraCharges = req.body.extraCharges !== undefined ? Number(req.body.extraCharges) : (order.extraCharges || 0);
    const grandTotal = req.body.grandTotal !== undefined ? Number(req.body.grandTotal) : Math.max(0, subtotal - discount + extraCharges);
    const advancePaid = req.body.advancePaid !== undefined ? Number(req.body.advancePaid) : (req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : (order.advancePaid || order.paidAmount || 0));
    const balanceDue = Math.max(0, grandTotal - advancePaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid';

    Object.assign(order, req.body, {
      items,
      subtotal,
      discount,
      discountType,
      discountValue,
      extraCharges,
      grandTotal,
      totalAmount: grandTotal,
      advancePaid,
      paidAmount: advancePaid,
      balanceDue,
      pendingAmount: balanceDue,
      paymentStatus,
      syncVersion: (order.syncVersion || 0) + 1,
    });

    if (req.body.deliveryDate) {
      order.deliveryDate = new Date(req.body.deliveryDate);
    }

    await order.save();

    // Auto-create/update measurement entries in Measurement collection for the customer
    if (Array.isArray(items) && order.customerId) {
      for (const item of items) {
        if (item.measurements && typeof item.measurements === 'object' && Object.keys(item.measurements).length > 0) {
          try {
            const cat = item.category || 'topWear';
            const existingMeas = await Measurement.find({
              customerId: order.customerId,
              category: cat,
              isDeleted: false,
            }).sort({ version: -1 });

            const latestVer = existingMeas.length > 0 ? (existingMeas[0].version || 0) : 0;
            const prevVerId = existingMeas.length > 0 ? existingMeas[0]._id : null;

            await Measurement.create({
              shopId: order.shopId || '6a738b5176dab967966f9041',
              customerId: order.customerId,
              category: cat,
              fields: item.measurements,
              version: latestVer + 1,
              previousVersionId: prevVerId,
              recordedBy: req.user?.name || 'owner',
            });
          } catch (mErr) {
            console.warn('[Order Update Measurement Sync Warning]:', mErr.message);
          }
        }
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Order Update Error]:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const markOrderAsPaid = async (req, res) => {
  try {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const paidVal = order.grandTotal || order.totalAmount || Math.max(0, (order.subtotal || 0) - (order.discount || 0) + (order.extraCharges || 0));
    order.advancePaid = paidVal;
    order.paidAmount = paidVal;
    order.balanceDue = 0;
    order.pendingAmount = 0;
    order.paymentStatus = 'paid';
    order.syncVersion = (order.syncVersion || 0) + 1;

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { newStatus } = req.body;
    const order = await findOrderByIdOrNumber(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = newStatus;
    order.timeline.push({ status: newStatus, timestamp: new Date(), updatedBy: req.user?.name || 'Admin' });
    order.syncVersion = (order.syncVersion || 0) + 1;
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
