import AuditLog from '../models/AuditLog.js';

export const auditLog = (entity, action) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        AuditLog.create({
          shopId: req.shopId || req.user?.shopId,
          userId: req.user?._id,
          action,
          entity,
          entityId: data?.data?._id || req.params.id,
          ipAddress: req.ip,
          before: req.bodyBefore || null,
          after: data?.data || null,
        }).catch(err => console.error('AuditLog Error:', err.message));
      }
      return originalJson.call(this, data);
    };

    next();
  };
};
