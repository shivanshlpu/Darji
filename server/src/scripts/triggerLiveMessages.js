const API_URL = 'http://localhost:5000/api/v1/whatsapp/test';

async function sendTestFlow() {
  const targetMobile = process.env.ADMIN_PHONE || '9000000000';
  const customerName = 'Shivansh Tiwari';

  const messages = [
    {
      title: '1. Order Booked Confirmation',
      text: `✨ *DARJI — ORDER BOOKED* ✨\n\nDear *${customerName} ji*,\nYour order *T-106* for Custom Designer Suit has been successfully created!\n\n💰 Total Amount: ₹5,500\n💵 Advance Paid: ₹2,000\n📌 Balance Due: ₹3,500\n📅 Target Delivery: 12-08-2026\n\nThank you for choosing *DARJI*!`,
    },
    {
      title: '2. Garment Ready for Pickup Alert',
      text: `🧵 *DARJI — GARMENT READY FOR PICKUP* 🧵\n\nDear *${customerName} ji*,\nGreat news! Your Custom Designer Suit (Order *T-106*) is completely ready for pickup.\n\n📍 Shop Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.)\n🗺️ Location Map: https://maps.app.goo.gl/wGwLLTRwZU4JuF3AA\n📞 Call/WhatsApp: 7828962210, 7000621972\n\nThank you for choosing *DARJI*!`,
    },
    {
      title: '3. Payment Receipt & Reminder',
      text: `🧾 *DARJI — PAYMENT REMINDER* 🧾\n\nNamaste *${customerName} ji*! 🙏\nThis is a gentle reminder regarding your pending balance of *₹3,500* at *DARJI*.\n\nPlease clear the pending amount at your earliest convenience or upon pickup.\n\n📍 Shop Address: 80/LIG 1ST New Housing Board Colony, Shahdol (M.P.)\n🗺️ Location Map: https://maps.app.goo.gl/wGwLLTRwZU4JuF3AA\n📞 Contact: 7828962210, 7000621972\n\nThank you for choosing *DARJI*!`,
    },
    {
      title: '4. Digital Tax Invoice',
      text: `📄 *DARJI — DIGITAL TAX INVOICE*\n\nInvoice #INV-2026-000106 generated for *${customerName}*.\nView your digital receipt and warranty details at *DARJI*.\nHave a wonderful day!`,
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
