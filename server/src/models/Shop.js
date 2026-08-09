import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: 'Darji Premium Tailors' },
    logoUrl: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    gstNumber: { type: String, default: '24AAACD1234E1Z9' },
    address: { type: String, default: '102, Fashion Market, MG Road, Surat - 395003' },
    phone: { type: String, default: '+91 99999 99999' },
    phoneNumbers: { type: [String], default: [] },
    email: { type: String, default: 'darjithetailoringshop@gmail.com' },
    reviewLink: { type: String, default: '' },
    reviewQrUrl: { type: String, default: null },
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'en-IN' },
    invoiceSettings: {
      prefix: { type: String, default: 'INV' },
      resetCycle: { type: String, enum: ['monthly', 'yearly'], default: 'yearly' },
      padding: { type: Number, default: 6 },
    },
    termsAndConditions: {
      type: [String],
      default: [
        'Garments not collected within 30 days are not our responsibility.',
        'Alterations accepted within 7 days of delivery with original bill.',
        'Subject to local jurisdiction only.',
      ],
    },
    themeMode: { type: String, enum: ['light', 'dark'], default: 'light' },
    syncVersion: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Shop', shopSchema);
