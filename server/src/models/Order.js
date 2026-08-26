import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  measurementVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement', default: null },
  measurements: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  qty: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true, default: 0 },
  notes: { type: String, default: '' },
});

const timelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'Admin' },
});

const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['cash', 'upi', 'card', 'bankTransfer'], default: 'cash' },
  type: { type: String, enum: ['advance', 'partial', 'final'], default: 'advance' },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  receivedBy: { type: String, default: 'Admin' },
  referenceId: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    orderNumber: { type: String, required: true, unique: true },
    tokenNumber: { type: String, required: true, default: 'T-100' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, default: null },
    priority: { type: String, enum: ['normal', 'urgent', 'vip'], default: 'normal' },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'cutting', 'stitching', 'trial', 'ready', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
    },
    items: [orderItemSchema],
    timeline: [timelineSchema],
    payments: [paymentRecordSchema],
    notes: { type: String, default: '' },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['amount', 'percent'], default: 'amount' },
    discountValue: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    lastPaymentDate: { type: Date, default: null },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
