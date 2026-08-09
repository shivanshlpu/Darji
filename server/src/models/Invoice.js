import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [
      {
        name: String,
        category: String,
        qty: Number,
        price: Number,
      },
    ],
    discount: { type: Number, default: 0 },
    gst: {
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      rate: { type: Number, default: 18 },
    },
    extraCharges: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    pdfUrl: { type: String, default: null },
    termsSnapshot: { type: String, default: 'Standard 30-day collection policy' },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Invoice', invoiceSchema);
