import Customer from '../models/Customer.js';

export const getCustomers = async (req, res) => {
  try {
    const { search, tag, pendingOnly } = req.query;
    const query = { shopId: req.shopId, isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag) query.tags = tag;
    if (pendingOnly === 'true') query.pendingAmount = { $gt: 0 };

    const customers = await Customer.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, shopId: req.shopId, isDeleted: false });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
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
