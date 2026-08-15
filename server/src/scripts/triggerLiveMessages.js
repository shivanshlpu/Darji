const API_URL = 'http://localhost:5000/api/v1/whatsapp/test';

async function sendTestFlow() {
  const targetMobile = process.env.ADMIN_PHONE || '9000000000';
  const customerName = 'Shivansh Tiwari';

  const messages = [
    {
      title: '1. Order Registered Confirmation',
      text: `✨ *DARJI — NEW ORDER REGISTERED* ✨\n\nDear *${customerName} ji*,\nYour order *T-103* (ORD-2026-002027) has been registered!\n\n📋 *Register Details*:\n• Items: 1x Top Wear\n\n⏳ Expected Delivery: 7 Days (17/08/2026)\n\n📍 Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001\n📞 Contact: +919479487828, +917000621972\n\nThank you for choosing *Darji*!`,
    },
    {
      title: '2. Order Ready for Pickup Alert',
      text: `🧵 *DARJI — ORDER READY FOR PICKUP* 🧵\n\nDear *${customerName} ji*,\nYour order *T-103* is completely ready! Please come to collect it at your earliest convenience.\n\n\n📍 Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001\n🗺️ Location Map: https://maps.app.goo.gl/wGwLLTRwZU4JuF3AA\n📞 Contact: +919479487828, +917000621972\n\nThank you for choosing *Darji*!`,
    },
    {
      title: '3. Payment Invoice Message',
      text: `Namaste ${customerName} ji! 🙏\nAttached is your official PDF Invoice #INV-0001 from *Darji*.\n\nTotal: ₹550\nAdvance Paid: ₹200\nBalance Due: ₹350\n\n⭐ *Rate Your Experience / Leave Feedback:* \nhttps://g.page/r/CVIGyGz2VDeQEBM/review\n\nThank you for choosing *Darji*!\n📞 Contact: +919479487828, +917000621972`,
    },
    {
      title: '4. Payment Reminder',
      text: `🧾 *DARJI — PAYMENT REMINDER* 🧾\n\nNamaste *${customerName} ji*! 🙏\nThis is a gentle reminder regarding your pending balance of *₹350* for order *T-103* at *DARJI*.\n\nPlease clear the pending amount at your earliest convenience or upon pickup.\n\n📍 Shop Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001\n📞 Contact: +919479487828, +917000621972\n\nThank you for choosing *Darji*!`,
    },
  ];

  console.log(`🚀 Sending Live WhatsApp Messages to ${customerName} (${targetMobile})...\n`);

  for (const item of messages) {
    console.log(`📨 Sending ${item.title}...`);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: targetMobile,
          text: item.text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log(`✅ SUCCESS! Message ID: ${data.messageId}`);
      } else {
        console.warn(`⚠️ Warning:`, data.error || data);
      }
    } catch (err) {
      console.error(`❌ Error sending message:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('\n🎉 ALL LIVE MESSAGES SENT TO YOUR WHATSAPP NUMBER! Check your WhatsApp app now.');
}

sendTestFlow();
