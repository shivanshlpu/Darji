import Measurement from '../models/Measurement.js';

export const getCustomerMeasurements = async (req, res) => {
  try {
    const measurements = await Measurement.find({
      shopId: req.shopId,
      customerId: req.params.customerId,
      isDeleted: false,
    }).sort({ version: -1 });

    res.json({ success: true, data: measurements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMeasurementVersion = async (req, res) => {
  try {
    const { customerId, category, fields, recordedBy } = req.body;

    const existing = await Measurement.find({
      shopId: req.shopId,
      customerId,
      category,
      isDeleted: false,
    }).sort({ version: -1 });

    const latestVersion = existing.length > 0 ? existing[0].version : 0;
    const previousVersionId = existing.length > 0 ? existing[0]._id : null;

    const measurement = await Measurement.create({
      shopId: req.shopId,
      customerId,
      category,
      fields,
      version: latestVersion + 1,
      previousVersionId,
      recordedBy: recordedBy || req.user?.name || 'owner',
    });

    res.status(201).json({ success: true, data: measurement });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
