import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    category: {
      type: String,
      enum: ['shop', 'employee', 'material', 'marketing', 'misc'],
      required: true,
    },
    subCategory: { type: String, default: '' },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'bankTransfer'], default: 'cash' },
    description: { type: String, required: true },
    receiptImageUrl: { type: String, default: null },
    isRecurringMonthly: { type: Boolean, default: false },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
