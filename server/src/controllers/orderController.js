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

    const orders = await Order.find(query).populate('customerId').sort({ createdAt: -1 });
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

    // 2. Resolve Customer ID and save Address
    let customerId = body.customerId;
    let cust = null;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      cust = await Customer.findById(customerId);
      if (cust && body.customerAddress && (!cust.address || cust.address !== body.customerAddress)) {
        cust.address = body.customerAddress.trim();
        await cust.save();
      }
    } else {
      const rawMobile = String(body.customerMobile || body.customerPhone || '').trim();
      if (rawMobile) {
        cust = await Customer.findOne({
          $or: [
            { mobile: rawMobile },
            { whatsapp: rawMobile },
            { mobile: { $regex: rawMobile.replace(/\D/g, '').slice(-10) || '___NONE___' } }
          ],
          isDeleted: false,
        });
      }
      if (cust) {
        customerId = cust._id;
        if (body.customerAddress && (!cust.address || cust.address !== body.customerAddress)) {
          cust.address = body.customerAddress.trim();
          await cust.save();
        }
      } else {
        cust = await Customer.create({
          shopId,
          name: body.customerName || 'Customer',
          mobile: rawMobile || '+91 9000000000',
          address: body.customerAddress ? body.customerAddress.trim() : '',
        });
        customerId = cust._id;
      }
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

    const subtotal = Math.round(Number(body.subtotal) || items.reduce((sum, item) => sum + (item.qty * item.price), 0));
    const discountType = body.discountType || 'amount';
    const discountValue = Number(body.discountValue !== undefined ? body.discountValue : (body.discount || 0));
    let discount = 0;
    if (discountType === 'percent') {
      discount = Math.round((subtotal * discountValue) / 100);
    } else {
      discount = Math.round(discountValue);
    }
    const extraCharges = Math.round(Number(body.extraCharges) || 0);
    const grandTotal = Math.max(0, Math.round(subtotal - discount + extraCharges));
    const paidAmount = Math.round(Number(body.paidAmount !== undefined ? body.paidAmount : (body.advancePaid !== undefined ? body.advancePaid : 0)));
    const pendingAmount = Math.max(0, grandTotal - paidAmount);
    const paymentStatus = pendingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    const delDate = body.deliveryDate ? new Date(body.deliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const resolvedAddress = body.customerAddress ? body.customerAddress.trim() : (cust?.address || '');
    const resolvedMobile = body.customerMobile ? body.customerMobile.trim() : (body.customerPhone ? body.customerPhone.trim() : (cust?.mobile || ''));

    const initialPayments = [];
    const initialPaymentDate = body.orderDate ? new Date(body.orderDate) : new Date();
    if (paidAmount > 0) {
      initialPayments.push({
        amount: paidAmount,
        mode: body.paymentMode || 'cash',
        type: pendingAmount <= 0 ? 'final' : 'advance',
        date: initialPaymentDate,
        notes: body.paymentNotes || (pendingAmount <= 0 ? 'Full payment on order creation' : 'Advance payment on order creation'),
        receivedBy: req.user?.name || 'Owner',
      });
    }

    const order = await Order.create({
      shopId,
      orderNumber,
      tokenNumber,
      customerId,
      customerName: body.customerName || cust?.name || 'Customer',
      customerMobile: resolvedMobile,
      customerPhone: resolvedMobile,
      customerAddress: resolvedAddress,
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
      payments: initialPayments,
      lastPaymentDate: paidAmount > 0 ? initialPaymentDate : null,
      timeline: [{ status: body.status || 'pending', timestamp: new Date(), updatedBy: 'Owner' }],
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
    const subtotal = Math.round(req.body.subtotal !== undefined ? Number(req.body.subtotal) : items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0));
    const discountType = req.body.discountType || order.discountType || 'amount';
    const discountValue = req.body.discountValue !== undefined ? Number(req.body.discountValue) : (order.discountValue || 0);
    let discount = 0;
    if (discountType === 'percent') {
      discount = Math.round((subtotal * discountValue) / 100);
    } else {
      discount = req.body.discount !== undefined ? Math.round(Number(req.body.discount)) : Math.round(discountValue || order.discount || 0);
    }
    const extraCharges = Math.round(req.body.extraCharges !== undefined ? Number(req.body.extraCharges) : (order.extraCharges || 0));
    const grandTotal = req.body.grandTotal !== undefined ? Math.round(Number(req.body.grandTotal)) : Math.max(0, Math.round(subtotal - discount + extraCharges));
    
    // Preserve existing payments or calculate from payments array
    let currentPayments = Array.isArray(req.body.payments) ? req.body.payments : (order.payments || []);
    let advancePaid = req.body.advancePaid !== undefined ? Math.round(Number(req.body.advancePaid)) : (req.body.paidAmount !== undefined ? Math.round(Number(req.body.paidAmount)) : (order.advancePaid || order.paidAmount || 0));
    
    if (currentPayments.length > 0) {
      advancePaid = currentPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    } else if (advancePaid > 0 && currentPayments.length === 0) {
      currentPayments = [{
        amount: advancePaid,
        mode: req.body.paymentMode || 'cash',
        type: 'advance',
        date: order.orderDate || order.createdAt || new Date(),
        notes: 'Initial payment record',
        receivedBy: req.user?.name || 'Owner',
      }];
    }

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
      payments: currentPayments,
      syncVersion: (order.syncVersion || 0) + 1,
    });

    if (req.body.customerAddress) {
      order.customerAddress = req.body.customerAddress.trim();
      if (order.customerId) {
        await Customer.findByIdAndUpdate(order.customerId, { address: req.body.customerAddress.trim() }).catch(() => {});
      }
    }
    if (req.body.customerMobile) {
      order.customerMobile = req.body.customerMobile.trim();
      order.customerPhone = req.body.customerMobile.trim();
    }

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

    const grandTotal = order.grandTotal || order.totalAmount || Math.max(0, (order.subtotal || 0) - (order.discount || 0) + (order.extraCharges || 0));
    const totalPaidAlready = Array.isArray(order.payments) && order.payments.length > 0
      ? order.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : (Number(order.paidAmount) || Number(order.advancePaid) || 0);

    const remainingToPay = Math.max(0, grandTotal - totalPaidAlready);
    const paymentDate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();
    const paymentMode = req.body?.mode || req.body?.paymentMode || 'cash';
    const notes = req.body?.notes || 'Marked as paid in full';

    if (!Array.isArray(order.payments)) {
      order.payments = [];
    }

    // If legacy order had existing paidAmount but no payments array, preserve the baseline payment
    if (order.payments.length === 0 && totalPaidAlready > 0) {
      order.payments.push({
        amount: totalPaidAlready,
        mode: 'cash',
        type: 'advance',
        date: order.orderDate || order.createdAt || new Date(),
        notes: 'Initial recorded payment',
        receivedBy: req.user?.name || 'Owner',
      });
    }

    // Add new payment entry with TODAY'S timestamp (or specified date)
    if (remainingToPay > 0) {
      order.payments.push({
        amount: remainingToPay,
        mode: paymentMode,
        type: 'final',
        date: paymentDate,
        notes,
        receivedBy: req.user?.name || 'Owner',
      });
    }

    const newTotalPaid = order.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    order.paidAmount = newTotalPaid;
    order.advancePaid = order.payments[0]?.amount || newTotalPaid;
    order.balanceDue = Math.max(0, grandTotal - newTotalPaid);
    order.pendingAmount = order.balanceDue;
    order.paymentStatus = order.balanceDue <= 0 ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid';
    order.lastPaymentDate = paymentDate;
    order.syncVersion = (order.syncVersion || 0) + 1;

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[Mark Paid Error]:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const addOrderPayment = async (req, res) => {
  try {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { amount, mode = 'cash', type = 'partial', date, notes = '', referenceId = '' } = req.body;
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    if (!Array.isArray(order.payments)) {
      order.payments = [];
    }

    // Legacy migration fallback
    if (order.payments.length === 0 && (order.paidAmount > 0 || order.advancePaid > 0)) {
      const priorPaid = Number(order.paidAmount) || Number(order.advancePaid) || 0;
      order.payments.push({
        amount: priorPaid,
        mode: 'cash',
        type: 'advance',
        date: order.orderDate || order.createdAt || new Date(),
        notes: 'Initial recorded payment',
        receivedBy: 'Owner',
      });
    }

    const paymentDate = date ? new Date(date) : new Date();
    order.payments.push({
      amount: paymentAmount,
      mode,
      type,
      date: paymentDate,
      notes,
      referenceId,
      receivedBy: req.user?.name || 'Owner',
    });

    const grandTotal = order.grandTotal || order.totalAmount || 0;
    const totalPaid = order.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    order.paidAmount = totalPaid;
    order.balanceDue = Math.max(0, grandTotal - totalPaid);
    order.pendingAmount = order.balanceDue;
    order.paymentStatus = order.balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
    order.lastPaymentDate = paymentDate;
    order.syncVersion = (order.syncVersion || 0) + 1;

    await order.save();

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[Add Order Payment Error]:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateOrderPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const order = await findOrderByIdOrNumber(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!Array.isArray(order.payments)) {
      order.payments = [];
    }

    const payment = order.payments.id(paymentId) || order.payments.find(p => String(p._id) === String(paymentId));
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const { amount, mode, type, date, notes, referenceId } = req.body;
    if (amount !== undefined) payment.amount = Number(amount);
    if (mode !== undefined) payment.mode = mode;
    if (type !== undefined) payment.type = type;
    if (date !== undefined) payment.date = new Date(date);
    if (notes !== undefined) payment.notes = notes;
    if (referenceId !== undefined) payment.referenceId = referenceId;

    const grandTotal = order.grandTotal || order.totalAmount || 0;
    const totalPaid = order.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    order.paidAmount = totalPaid;
    order.balanceDue = Math.max(0, grandTotal - totalPaid);
    order.pendingAmount = order.balanceDue;
    order.paymentStatus = order.balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
    order.syncVersion = (order.syncVersion || 0) + 1;

    await order.save();

    res.json({ success: true, data: order, message: 'Payment entry updated successfully' });
  } catch (err) {
    console.error('[Update Order Payment Error]:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteOrderPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const order = await findOrderByIdOrNumber(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!Array.isArray(order.payments)) {
      order.payments = [];
    }

    order.payments = order.payments.filter(p => String(p._id) !== String(paymentId));

    const grandTotal = order.grandTotal || order.totalAmount || 0;
    const totalPaid = order.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    order.paidAmount = totalPaid;
    order.advancePaid = order.payments[0]?.amount || 0;
    order.balanceDue = Math.max(0, grandTotal - totalPaid);
    order.pendingAmount = order.balanceDue;
    order.paymentStatus = order.balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
    order.syncVersion = (order.syncVersion || 0) + 1;

    await order.save();

    res.json({ success: true, data: order, message: 'Payment entry removed' });
  } catch (err) {
    console.error('[Delete Order Payment Error]:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const migrateExistingOrderPayments = async (req, res) => {
  try {
    const query = { isDeleted: false };
    if (req.shopId) query.shopId = req.shopId;

    const orders = await Order.find(query);
    let migratedCount = 0;

    for (const order of orders) {
      if ((!order.payments || order.payments.length === 0) && (order.paidAmount > 0 || order.advancePaid > 0)) {
        const amt = Number(order.paidAmount) || Number(order.advancePaid) || 0;
        const pDate = order.orderDate || order.createdAt || new Date();
        order.payments = [{
          amount: amt,
          mode: 'cash',
          type: order.paymentStatus === 'paid' ? 'final' : 'advance',
          date: pDate,
          notes: 'Legacy entry preserved',
          receivedBy: 'Owner',
        }];
        order.lastPaymentDate = pDate;
        await order.save();
        migratedCount++;
      }
    }

    res.json({ success: true, message: `Successfully verified and normalized ${migratedCount} order payment records.` });
  } catch (err) {
    console.error('[Payment Migration Error]:', err);
    res.status(500).json({ success: false, message: err.message });
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

export const deleteOrder = async (req, res) => {
  try {
    const idParam = req.params.id;
    let query = { isDeleted: false };
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      query = { _id: idParam };
    } else {
      query = { orderNumber: idParam };
    }
    if (req.shopId) query.shopId = req.shopId;

    const order = await Order.findOneAndUpdate(
      query,
      { isDeleted: true, syncVersion: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: `Order #${order.tokenNumber || order.orderNumber} deleted successfully`,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
