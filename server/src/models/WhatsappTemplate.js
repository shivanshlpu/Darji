import mongoose from 'mongoose';

const whatsappTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    placeholders: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const WhatsappTemplate = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);
export default WhatsappTemplate;
