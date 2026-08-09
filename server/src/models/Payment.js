import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    mode: { type: String, enum: ['cash', 'upi', 'card', 'bankTransfer'], default: 'cash' },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['advance', 'partial', 'final'], default: 'advance' },
    receivedAt: { type: Date, default: Date.now },
    receivedBy: { type: String, default: 'owner' },
    referenceId: { type: String, default: '' },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
