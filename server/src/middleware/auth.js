import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'darji_erp_secret_key_2026_secure_jwt');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Access denied' });
    }

    req.user = user;
    req.shopId = user.shopId || user._id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Access denied' });
  }
};
