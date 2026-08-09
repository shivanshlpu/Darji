import mongoose from 'mongoose';

const cashbookSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    openingCash: { type: Number, required: true, default: 0 },
    cashSales: { type: Number, default: 0 },
    onlineSales: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    closingCashExpected: { type: Number, required: true },
    closingCashActual: { type: Number, required: true },
    mismatch: { type: Number, default: 0 },
    mismatchReason: { type: String, default: '' },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Cashbook', cashbookSchema);
