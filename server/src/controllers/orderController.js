import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Measurement from '../models/Measurement.js';
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

    let customerId = body.customerId;
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      if (body.customerMobile) {
        let cust = await Customer.findOne({ mobile: body.customerMobile, isDeleted: false });
        if (!cust) {
          cust = await Customer.create({
            shopId: req.shopId,
            name: body.customerName || 'Customer',
            mobile: body.customerMobile,
            address: body.customerAddress || '',
          });
        }
        customerId = cust._id;
      } else {
        const dummyCust = await Customer.create({
          shopId: req.shopId,
          name: body.customerName || 'Walk-in Customer',
          mobile: '9000000000',
        });
        customerId = dummyCust._id;
      }
    }

    const orderCount = await Order.countDocuments({ shopId: req.shopId });
    const orderNumber = body.orderNumber || `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, '0')}`;
    const tokenNumber = body.tokenNumber || `T-${101 + orderCount}`;
    const delDate = body.deliveryDate ? new Date(body.deliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const order = await Order.create({
      shopId: req.shopId,
      orderNumber,
      tokenNumber,
      customerId,
      customerName: body.customerName || 'Customer',
      customerMobile: body.customerMobile || '',
      deliveryDate: delDate,
      priority: body.priority || 'normal',
      status: body.status || 'pending',
      items: Array.isArray(body.items) ? body.items : [{ name: 'Custom Suit', category: 'topWear', qty: 1, price: 1200 }],
      notes: body.notes || '',
      subtotal: Number(body.subtotal) || 1200,
      paidAmount: Number(body.paidAmount || body.advancePaid) || 0,
      pendingAmount: Number(body.pendingAmount || body.balanceDue) || 1200,
      paymentStatus: body.paymentStatus || 'unpaid',
      timeline: [{ status: 'pending', timestamp: new Date(), updatedBy: 'Owner' }],
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const items = req.body.items || order.items;
    const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0);
    const totalAmount = req.body.totalAmount !== undefined ? Number(req.body.totalAmount) : (order.totalAmount || subtotal);
    const advancePaid = req.body.advancePaid !== undefined ? Number(req.body.advancePaid) : (order.advancePaid || order.paidAmount || 0);
    const balanceDue = Math.max(0, totalAmount - advancePaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid';

    Object.assign(order, req.body, {
      items,
      subtotal,
      totalAmount,
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

    const paidVal = order.totalAmount || order.subtotal || 0;
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
