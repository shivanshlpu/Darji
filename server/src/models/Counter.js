import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  periodKey: { type: String, required: true }, // e.g. "2026" or "2026-08"
  seq: { type: Number, default: 0 },
});

counterSchema.index({ shopId: 1, periodKey: 1 }, { unique: true });

export default mongoose.model('Counter', counterSchema);
