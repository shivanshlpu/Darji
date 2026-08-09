import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import { generateNextInvoiceNumber } from '../services/invoiceNumber.js';

export const createInvoice = async (req, res) => {
  try {
    const { orderId, discount = 0, gstRate = 18, extraCharges = 0, isSameState = true } = req.body;

    const order = await Order.findOne({ _id: orderId, shopId: req.shopId, isDeleted: false });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Section 7.6 GST Math Formula
    const subtotal = order.subtotal;
    const taxableValue = Math.max(0, subtotal - discount);

    const cgst = isSameState ? (taxableValue * (gstRate / 2)) / 100 : 0;
    const sgst = isSameState ? (taxableValue * (gstRate / 2)) / 100 : 0;
    const igst = !isSameState ? (taxableValue * gstRate) / 100 : 0;

    const unroundedTotal = taxableValue + cgst + sgst + igst + extraCharges;
    const grandTotal = Math.round(unroundedTotal);
    const roundOff = parseFloat((grandTotal - unroundedTotal).toFixed(2));

    const invoiceNumber = await generateNextInvoiceNumber(req.shopId);

    const invoice = await Invoice.create({
      shopId: req.shopId,
      invoiceNumber,
      orderId,
      customerId: order.customerId,
      items: order.items,
      discount,
      gst: { cgst, sgst, igst, rate: gstRate },
      extraCharges,
      subtotal,
      grandTotal,
      roundOff,
      paymentStatus: order.paymentStatus,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
