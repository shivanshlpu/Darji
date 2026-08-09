import Payment from '../models/Payment.js';
import Order from '../models/Order.js';

export const addPayment = async (req, res) => {
  try {
    const { orderId, amount, mode, type, referenceId } = req.body;

    const order = await Order.findOne({ _id: orderId, shopId: req.shopId, isDeleted: false });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const payment = await Payment.create({
      shopId: req.shopId,
      orderId,
      customerId: order.customerId,
      amount,
      mode,
      type,
      referenceId,
      receivedBy: req.user?.name || 'owner',
    });

    // Recompute total payments from ledger per Section 7.3
    const allPayments = await Payment.find({ orderId, shopId: req.shopId, isDeleted: false });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    order.paidAmount = totalPaid;
    order.pendingAmount = Math.max(0, order.subtotal - totalPaid);
    order.paymentStatus = order.pendingAmount <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
    await order.save();

    res.status(201).json({ success: true, data: payment, orderSummary: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
