import mongoose from 'mongoose';

const measurementSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    fields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    version: { type: Number, required: true, default: 1 },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement', default: null },
    recordedBy: { type: String, default: 'owner' },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Measurement', measurementSchema);
