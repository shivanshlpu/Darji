import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
    pinHash: { type: String, default: null },
    biometricEnabled: { type: Boolean, default: false },
    permissions: [{ type: String }],
    lastLoginAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
