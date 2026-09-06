import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

export const getCustomers = async (req, res) => {
  try {
    const { search, tag, pendingOnly } = req.query;
    const query = { isDeleted: false };
    if (req.shopId) query.shopId = req.shopId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag) query.tags = tag;

    let customers = await Customer.find(query).sort({ updatedAt: -1 }).lean();

    // Dynamically compute real-time pendingAmount & totalSpending from all non-cancelled orders
    const custIds = customers.map(c => c._id);
    const custNames = customers.map(c => c.name).filter(Boolean);

    const orderQuery = {
      isDeleted: false,
      status: { $ne: 'cancelled' },
      $or: [
        { customerId: { $in: custIds } },
        { customerName: { $in: custNames } }
      ]
    };
    if (req.shopId) orderQuery.shopId = req.shopId;

    const orders = await Order.find(orderQuery)
      .select('customerId customerName subtotal grandTotal totalAmount paidAmount advancePaid pendingAmount balanceDue createdAt orderDate')
      .lean();

    const customerOrderMap = new Map();
    for (const ord of orders) {
      const cIdStr = ord.customerId ? ord.customerId.toString() : '';
      const cName = ord.customerName ? ord.customerName.trim().toLowerCase() : '';

      const matchedCust = customers.find(c =>
        (cIdStr && c._id.toString() === cIdStr) ||
        (cName && c.name && c.name.trim().toLowerCase() === cName)
      );
      if (!matchedCust) continue;

      const key = matchedCust._id.toString();
      if (!customerOrderMap.has(key)) {
        customerOrderMap.set(key, { totalSpending: 0, pendingAmount: 0, lastVisit: null });
      }
      const data = customerOrderMap.get(key);
      const grandTotal = Number(ord.grandTotal || ord.totalAmount || ord.subtotal || 0);
      const pending = Number(ord.pendingAmount !== undefined ? ord.pendingAmount : (ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, grandTotal - (ord.paidAmount || 0))));

      data.totalSpending += grandTotal;
      data.pendingAmount += pending;
      const oDate = ord.orderDate || ord.createdAt;
      if (oDate && (!data.lastVisit || new Date(oDate) > new Date(data.lastVisit))) {
        data.lastVisit = oDate;
      }
    }

    customers = customers.map(c => {
      const stats = customerOrderMap.get(c._id.toString());
      return {
        ...c,
        totalSpending: stats ? stats.totalSpending : 0,
        pendingAmount: stats ? stats.pendingAmount : 0,
        lastVisit: stats?.lastVisit || c.lastVisit,
      };
    });

    if (pendingOnly === 'true') {
      customers = customers.filter(c => (c.pendingAmount || 0) > 0);
    }

    res.json({ success: true, count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const query = { _id: req.params.id, isDeleted: false };
    if (req.shopId) query.shopId = req.shopId;
    const customer = await Customer.findOne(query).lean();
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const orderQuery = {
      isDeleted: false,
      status: { $ne: 'cancelled' },
      $or: [
        { customerId: customer._id },
        ...(customer.name ? [{ customerName: customer.name }] : [])
      ]
    };
    if (req.shopId) orderQuery.shopId = req.shopId;

    const orders = await Order.find(orderQuery)
      .select('subtotal grandTotal totalAmount paidAmount advancePaid pendingAmount balanceDue createdAt orderDate')
      .lean();

    let liveSpending = 0;
    let livePending = 0;
    let lastVisit = customer.lastVisit;

    for (const o of orders) {
      const grandTotal = Number(o.grandTotal || o.totalAmount || o.subtotal || 0);
      const pending = Number(o.pendingAmount !== undefined ? o.pendingAmount : (o.balanceDue !== undefined ? o.balanceDue : Math.max(0, grandTotal - (o.paidAmount || 0))));
      liveSpending += grandTotal;
      livePending += pending;
      const oDate = o.orderDate || o.createdAt;
      if (oDate && (!lastVisit || new Date(oDate) > new Date(lastVisit))) {
        lastVisit = oDate;
      }
    }

    customer.totalSpending = liveSpending > 0 ? liveSpending : (customer.totalSpending || 0);
    customer.pendingAmount = livePending;
    customer.lastVisit = lastVisit;

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      shopId: req.shopId,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId, isDeleted: false },
      { ...req.body, $inc: { syncVersion: 1 } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      { isDeleted: true, $inc: { syncVersion: 1 } },
      { new: true }
    );
    res.json({ success: true, message: 'Customer deleted (soft delete)' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
