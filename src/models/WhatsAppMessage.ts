import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  phoneNumber: string;
  messageContent: string;
  direction: 'incoming' | 'outgoing';
  relatedInvoice: mongoose.Types.ObjectId | null;
  relatedCustomer: mongoose.Types.ObjectId | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  shop: mongoose.Types.ObjectId;
  externalMessageId: string;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappMessageSchema = new Schema<IWhatsAppMessage>(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    relatedInvoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    relatedCustomer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    externalMessageId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

whatsappMessageSchema.index({ shop: 1, phoneNumber: 1 });
whatsappMessageSchema.index({ shop: 1, createdAt: -1 });
whatsappMessageSchema.index({ relatedCustomer: 1 });

export default mongoose.models.WhatsAppMessage ||
  mongoose.model<IWhatsAppMessage>('WhatsAppMessage', whatsappMessageSchema);
