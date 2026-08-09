import mongoose from 'mongoose';

const whatsappSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      default: 'studio-main',
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'authenticating'],
      default: 'disconnected',
    },
    qrCode: {
      type: String,
      default: null,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    lastPing: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const WhatsappSession = mongoose.model('WhatsappSession', whatsappSessionSchema);
export default WhatsappSession;
