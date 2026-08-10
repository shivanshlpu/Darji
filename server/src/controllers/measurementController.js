import Measurement from '../models/Measurement.js';
import Shop from '../models/Shop.js';

export const getCustomerMeasurements = async (req, res) => {
  try {
    let shopId = req.shopId || req.user?.shopId;
    if (!shopId) {
      const defaultShop = await Shop.findOne({ isDeleted: false });
      shopId = defaultShop?._id;
    }

    const query = { customerId: req.params.customerId, isDeleted: false };
    if (shopId) query.shopId = shopId;

    const measurements = await Measurement.find(query).sort({ version: -1 });

    res.json({ success: true, data: measurements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMeasurementVersion = async (req, res) => {
  try {
    const { customerId, category, fields, recordedBy } = req.body;

    if (!customerId || !category) {
      return res.status(400).json({ success: false, message: 'customerId and category are required' });
    }

    let shopId = req.shopId || req.user?.shopId;
    if (!shopId) {
      const defaultShop = await Shop.findOne({ isDeleted: false });
      shopId = defaultShop?._id;
    }

    const query = { customerId, category, isDeleted: false };
    if (shopId) query.shopId = shopId;

    const existing = await Measurement.find(query).sort({ version: -1 });

    const latestVersion = existing.length > 0 ? (existing[0].version || 0) : 0;
    const previousVersionId = existing.length > 0 ? existing[0]._id : null;

    const measurement = await Measurement.create({
      shopId: shopId || '6a738b5176dab967966f9041',
      customerId,
      category,
      fields: fields || {},
      version: latestVersion + 1,
      previousVersionId,
      recordedBy: recordedBy || req.user?.name || 'owner',
    });

    res.status(201).json({ success: true, data: measurement });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
