import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import Shop from '../models/Shop.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Measurement from '../models/Measurement.js';
import { sendWhatsappMessage, initWhatsapp } from '../services/whatsapp.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeedAndWhatsAppFlow() {
  console.log('🚀 Connecting to Database...');
  await connectDB();

  // Initialize WhatsApp Socket
  console.log('📡 Initializing WhatsApp Socket...');
  await initWhatsapp();

  // Wait 3 seconds to ensure socket is ready
  await new Promise((r) => setTimeout(r, 3000));

  // Get or Create Shop
  let shop = await Shop.findOne();
  if (!shop) {
    shop = await Shop.create({
      name: 'Darji Premium Tailors',
      phone: process.env.ADMIN_PHONE || '9000000000',
      email: 'contact@darjitailors.com',
      ownerId: new mongoose.Types.ObjectId(),
      address: '102, Fashion Market, MG Road, Surat',
    });
  }

  const shopId = shop._id;
  const targetMobile = process.env.ADMIN_PHONE || '9000000000';
  const customerName = 'Shivansh Tiwari';

  console.log(`\n======================================================`);
  console.log(`👤 Creating/Updating Customer Record: ${customerName} (${targetMobile})`);
  console.log(`======================================================\n`);

  // 1. Create or Update Customer
  let customer = await Customer.findOne({ mobile: targetMobile });
  if (!customer) {
    customer = await Customer.create({
      shopId,
      name: customerName,
      mobile: targetMobile,
      whatsapp: targetMobile,
      address: '102, Royal Residency, VIP Road, Surat',
      notes: 'VIP Customer - Custom Designer Suit',
    });
  } else {
    customer.name = customerName;
    customer.address = '102, Royal Residency, VIP Road, Surat';
    await customer.save();
  }

  console.log(`✅ Customer Saved: ID=${customer._id}, Name=${customer.name}`);

  // 2. Create Measurement Record
  let measurement = await Measurement.create({
    shopId,
    customerId: customer._id,
    category: 'suit',
    fields: {
      chest: '38',
      waist: '32',
      length: '40',
      shoulder: '17.5',
      sleeves: '24',
      neck: '15.5',
    },
  });
  console.log(`✅ Measurements Recorded for Shivansh Tiwari`);

  // 3. Create New Order T-106
  const orderNumber = 'T-106';
  let order = await Order.create({
    shopId,
    orderNumber,
    tokenNumber: orderNumber,
    customerId: customer._id,
    customerName: customer.name,
    customerMobile: customer.mobile,
    items: [
      {
        name: 'Custom Designer Suit',
        category: 'suit',
        garmentType: 'Custom Designer Suit',
        clothType: 'Italian Wool Navy Blue',
        stitchingCost: 4500,
        clothCost: 1000,
        totalCost: 5500,
      },
    ],
    totalAmount: 5500,
    advancePaid: 2000,
    balanceDue: 3500,
    status: 'ready',
    paymentStatus: 'paid',
    orderDate: new Date(),
    deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });

  console.log(`✅ Order Created: Token=${order.tokenNumber}, Total=₹${order.totalAmount}`);

  // 4. Send Live WhatsApp Messages Flow to Owner
  console.log(`\n======================================================`);
  console.log(`📲 TRIGGERING LIVE WHATSAPP FLOW TO ${targetMobile}...`);
  console.log(`======================================================\n`);

  try {
    // Message 1: Order Registered
    const msg1 = `✨ *DARJI — NEW ORDER REGISTERED* ✨\n\nDear *${customerName} ji*,\nYour order *T-103* (${orderNumber}) has been registered!\n\n📋 *Register Details*:\n• Items: 1x Top Wear\n\n⏳ Expected Delivery: 7 Days (17/08/2026)\n\n📍 Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001\n📞 Contact: +919479487828, +917000621972\n\nThank you for choosing *Darji*!`;
    console.log('📨 Sending Message 1: Order Registration...');
    const res1 = await sendWhatsappMessage(targetMobile, msg1);
    console.log(`✅ Message 1 Sent! ID: ${res1.messageId}`);

    await new Promise((r) => setTimeout(r, 2500));

    // Message 2: Order Ready Alert
    const msg2 = `🧵 *DARJI — ORDER READY FOR PICKUP* 🧵\n\nDear *${customerName} ji*,\nYour order *T-103* is completely ready! Please come to collect it at your earliest convenience.\n\n\n📍 Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001\n🗺️ Location Map: https://maps.app.goo.gl/wGwLLTRwZU4JuF3AA\n📞 Contact: +919479487828, +917000621972\n\nThank you for choosing *Darji*!`;
    console.log('📨 Sending Message 2: Order Ready Alert...');
    const res2 = await sendWhatsappMessage(targetMobile, msg2);
    console.log(`✅ Message 2 Sent! ID: ${res2.messageId}`);

    await new Promise((r) => setTimeout(r, 2500));

    // Message 3: Payment Invoice Message
    const msg3 = `Namaste ${customerName} ji! 🙏\nAttached is your official PDF Invoice #INV-0001 from *Darji*.\n\nTotal: ₹550\nAdvance Paid: ₹200\nBalance Due: ₹350\n\n⭐ *Rate Your Experience / Leave Feedback:* \nhttps://g.page/r/CVIGyGz2VDeQEBM/review\n\nThank you for choosing *Darji*!\n📞 Contact: +919479487828, +917000621972`;
    console.log('📨 Sending Message 3: Payment Invoice Message...');
    const res3 = await sendWhatsappMessage(targetMobile, msg3);
    console.log(`✅ Message 3 Sent! ID: ${res3.messageId}`);

    await new Promise((r) => setTimeout(r, 2500));

    // Message 4: Payment Reminder
    const msg4 = `🧾 *DARJI — PAYMENT REMINDER* 🧾\n\nNamaste *${customerName} ji*! 🙏\nThis is a gentle reminder regarding your pending balance of *₹350* for order *T-103* at *DARJI*.\n\nPlease clear the pending amount at your earliest convenience or upon pickup.\n\n📍 Shop Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001\n📞 Contact: +919479487828, +917000621972\n\nThank you for choosing *Darji*!`;
    console.log('📨 Sending Message 4: Payment Reminder...');
    const res4 = await sendWhatsappMessage(targetMobile, msg4);
    console.log(`✅ Message 4 Sent! ID: ${res4.messageId}`);

    console.log(`\n🎉 ALL 4 LIVE WHATSAPP MESSAGES SENT SUCCESSFULLY TO ${targetMobile} (${customerName})!`);
  } catch (err) {
    console.error('❌ Error sending WhatsApp message flow:', err.message);
  }

  process.exit(0);
}

runSeedAndWhatsAppFlow();
