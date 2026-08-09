import mongoose from 'mongoose';

const whatsappAuthKeySchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      default: 'studio-main',
      required: true,
      index: true,
    },
    keyId: {
      type: String, // e.g. 'creds.json', 'app-state-sync-key-1', etc.
      required: true,
    },
    data: {
      type: String, // Serialized JSON content
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

whatsappAuthKeySchema.index({ sessionId: 1, keyId: 1 }, { unique: true });

const WhatsappAuthKey = mongoose.model('WhatsappAuthKey', whatsappAuthKeySchema);
export default WhatsappAuthKey;
