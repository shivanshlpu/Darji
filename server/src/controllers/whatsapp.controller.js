import {
  getWhatsappStatus,
  disconnectWhatsapp,
  initWhatsapp,
  sendWhatsappMessage,
} from '../services/whatsapp.service.js';
import WhatsappTemplate from '../models/WhatsappTemplate.js';
import WhatsappLog from '../models/WhatsappLog.js';

export const getStatus = async (req, res) => {
  try {
    const result = await getWhatsappStatus();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const disconnect = async (req, res) => {
  try {
    const result = await disconnectWhatsapp();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const reconnect = async (req, res) => {
  try {
    process.env.ENABLE_WHATSAPP = 'true';
    initWhatsapp();
    res.json({ success: true, message: 'Reinitialization triggered.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendTestMessage = async (req, res) => {
  try {
    const { mobile, text, mediaPath } = req.body;
    if (!mobile || !text) {
      return res.status(400).json({ success: false, error: 'mobile and text fields are required.' });
    }

    const result = await sendWhatsappMessage(mobile, text, mediaPath, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendInvoicePDF = async (req, res) => {
  try {
    const { order, orderId, mobile } = req.body;
    let targetOrder = order;

    if (!targetOrder && orderId) {
      const Order = (await import('../models/Order.js')).default;
      targetOrder = await Order.findById(orderId);
    }

    if (!targetOrder) {
      return res.status(400).json({ success: false, error: 'Order data or valid orderId is required.' });
    }

    const targetMobile = mobile || targetOrder.customerPhone || targetOrder.customer?.phone || targetOrder.customerMobile;
    if (!targetMobile) {
      return res.status(400).json({ success: false, error: 'Customer mobile number is required.' });
    }

    const Shop = (await import('../models/Shop.js')).default;
    const { generateInvoicePDF } = await import('../services/pdf.service.js');

    const shopConfig = (req.shopId ? await Shop.findById(req.shopId) : await Shop.findOne()) || {};
    const shopInfo = {
      shopName: shopConfig.name || 'Darji',
      phone: shopConfig.phone || '',
      address: shopConfig.address || '',
      email: shopConfig.email || 'darji.tailoring@gmail.com',
      signatureUrl: shopConfig.signatureUrl || null,
      logoUrl: shopConfig.logoUrl || null,
      terms: Array.isArray(shopConfig.termsAndConditions) ? shopConfig.termsAndConditions.join('\n') : (shopConfig.termsAndConditions || ''),
      termsAndConditions: shopConfig.termsAndConditions,
      reviewLink: shopConfig.reviewLink || '',
      reviewQrUrl: shopConfig.reviewQrUrl || null,
    };

    // Generate or use provided PDF Buffer from frontend browser renderer
    let pdfBuffer;
    if (req.body.pdfBase64 && typeof req.body.pdfBase64 === 'string' && req.body.pdfBase64.trim().length > 500) {
      const base64Data = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      if (buf.length > 500) {
        pdfBuffer = buf;
      }
    }
    if (!pdfBuffer) {
      console.log('[WhatsApp Controller] Frontend PDF missing or invalid size; generating via server pdfService...');
      pdfBuffer = await generateInvoicePDF(targetOrder, shopInfo);
    }

    const invoiceNo = targetOrder.invoiceNo || targetOrder.orderNumber || `INV-${targetOrder._id?.toString().slice(-6).toUpperCase() || '0001'}`;
    const fileName = `Invoice_${invoiceNo}.pdf`;

    const customerName = targetOrder.customerName || targetOrder.customer?.name || 'Customer';
    const totalAmount = Number(targetOrder.grandTotal || targetOrder.totalAmount || targetOrder.subtotal || targetOrder.amount || 0);
    const advancePaid = Number(targetOrder.paidAmount !== undefined ? targetOrder.paidAmount : (targetOrder.advancePaid !== undefined ? targetOrder.advancePaid : (targetOrder.paid !== undefined ? targetOrder.paid : (targetOrder.advance || 0))));
    const balanceDue = Number(targetOrder.balanceDue !== undefined ? targetOrder.balanceDue : (targetOrder.remaining !== undefined ? targetOrder.remaining : (targetOrder.pendingAmount !== undefined ? targetOrder.pendingAmount : Math.max(0, totalAmount - advancePaid))));

    const shopName = shopConfig.name || 'DARJI';
    const shopPhone = shopConfig.phone || shopConfig.ownerMobile || '';

    let captionText = `Namaste ${customerName} ji! 🙏\nAttached is your official PDF Invoice #${invoiceNo} from *${shopName}*.\n\nTotal: ₹${totalAmount.toLocaleString('en-IN')}\nAdvance Paid: ₹${advancePaid.toLocaleString('en-IN')}\nBalance Due: ₹${balanceDue.toLocaleString('en-IN')}\n`;

    if (shopConfig.reviewLink) {
      const rawReview = shopConfig.reviewLink.trim();
      const reviewUrl = /^https?:\/\//i.test(rawReview) ? rawReview : `https://${rawReview}`;
      captionText += `\n⭐ *Rate Your Experience / Leave Feedback:* \n${reviewUrl}\n`;
    }

    captionText += `\nThank you for choosing *${shopName}*!`;
    if (shopPhone) {
      captionText += `\n📞 Contact: ${shopPhone}`;
    }

    // Send PDF document via WhatsApp Baileys Engine
    const result = await sendWhatsappMessage(targetMobile, captionText, pdfBuffer, req.user?.id, fileName);
    res.json({ success: true, message: `PDF Invoice #${invoiceNo} sent to +91 ${targetMobile}!`, ...result });
  } catch (err) {
    console.error('[WhatsApp Controller] sendInvoicePDF error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendPaymentReminder = async (req, res) => {
  try {
    const { order, orderId, mobile } = req.body;
    let targetOrder = order;

    if (!targetOrder && orderId) {
      const Order = (await import('../models/Order.js')).default;
      targetOrder = await Order.findOne({ $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { orderNumber: orderId }, { tokenNumber: orderId }] });
    }

    const targetMobile = mobile || targetOrder?.customerPhone || targetOrder?.customer?.phone || targetOrder?.customerMobile;
    if (!targetMobile) {
      return res.status(400).json({ success: false, error: 'Customer mobile number is required.' });
    }

    const customerName = targetOrder?.customerName || targetOrder?.customer?.name || 'Customer';
    const pendingAmount = targetOrder?.balanceDue || targetOrder?.remaining || targetOrder?.pendingAmount || targetOrder?.grandTotal || 0;
    const tokenStr = targetOrder?.tokenNumber || targetOrder?.orderNumber || 'Order';

    const text = `🧾 *DARJI — PAYMENT REMINDER* 🧾\n\nNamaste *${customerName} ji*! 🙏\nThis is a gentle reminder regarding your pending balance of *₹${pendingAmount.toLocaleString('en-IN')}* for order *${tokenStr}* at *DARJI*.\n\nPlease clear the pending amount at your earliest convenience or upon pickup.\n\n📍 Shop Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.)\n📞 Contact: 7828962210, 7000621972\n\nThank you for choosing *DARJI*!`;

    const result = await sendWhatsappMessage(targetMobile, text, null, req.user?.id);
    res.json({ success: true, message: `Payment reminder sent to +91 ${targetMobile}!`, ...result });
  } catch (err) {
    console.error('[WhatsApp Controller] sendPaymentReminder error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTemplates = async (req, res) => {
  try {
    let templates = await WhatsappTemplate.find();
    if (templates.length === 0) {
      // Seed initial default templates
      templates = await WhatsappTemplate.create([
        {
          name: 'ORDER_READY',
          content: 'Dear {{customerName}}, your order {{tokenNumber}} is ready for pickup at DARJI! Total bill: ₹{{amount}}.',
          placeholders: ['customerName', 'tokenNumber', 'amount'],
        },
        {
          name: 'PAYMENT_REMINDER',
          content: 'Namaste {{customerName}}, a pending payment of ₹{{pendingAmount}} is due for order {{tokenNumber}}. Please collect your garment.',
          placeholders: ['customerName', 'pendingAmount', 'tokenNumber'],
        },
      ]);
    }
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const saveTemplate = async (req, res) => {
  try {
    const { name, content, placeholders } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, error: 'name and content fields are required.' });
    }

    const template = await WhatsappTemplate.findOneAndUpdate(
      { name },
      { content, placeholders: placeholders || [] },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getLogs = async (req, res) => {
  try {
    const logs = await WhatsappLog.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
