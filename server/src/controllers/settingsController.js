import Shop from '../models/Shop.js';

export const getShopSettings = async (req, res) => {
  try {
    let shop = null;
    if (req.shopId) {
      shop = await Shop.findById(req.shopId);
    }
    if (!shop) {
      shop = await Shop.findOne({ isDeleted: false });
    }
    if (!shop) {
      shop = await Shop.create({
        name: 'Darji Premium Tailors',
        phone: '+91 99999 99999',
        email: 'darjithetailoringshop@gmail.com',
        gstNumber: '24AAACD1234E1Z9',
        address: '102, Fashion Market, MG Road, Surat - 395003',
      });
    }
    res.json({ success: true, data: shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateShopSettings = async (req, res) => {
  try {
    let shop = null;
    if (req.shopId) {
      shop = await Shop.findByIdAndUpdate(
        req.shopId,
        { ...req.body, $inc: { syncVersion: 1 } },
        { new: true }
      );
    }
    if (!shop) {
      shop = await Shop.findOneAndUpdate(
        { isDeleted: false },
        { ...req.body, $inc: { syncVersion: 1 } },
        { new: true, upsert: true }
      );
    }
    res.json({ success: true, data: shop });
  } catch (err) {
    console.error('[Update Settings Error]:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};
