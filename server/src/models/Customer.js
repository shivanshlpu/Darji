import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    whatsapp: { type: String, default: '' },
    address: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
    photoUrl: { type: String, default: null },
    dob: { type: Date, default: null },
    anniversary: { type: Date, default: null },
    notes: { type: String, default: '' },
    totalSpending: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now },
    tags: [{ type: String }],
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Customer', customerSchema);
