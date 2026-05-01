import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageDelivery extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userSubscriptionType: string;
  messageDayNumber: number;
  messageBatchName: string;
  category: string;
  activity: string;
  affirmation: string;
  sentDate: Date;
  sentVia: 'email' | 'sms' | 'both';
  status: 'sent' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

const MessageDeliverySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  userSubscriptionType: { type: String, required: true },
  messageDayNumber: { type: Number, required: true },
  messageBatchName: { type: String, required: true },
  category: { type: String, required: true },
  activity: { type: String, required: true },
  affirmation: { type: String, required: true },
  sentDate: { type: Date, required: true },
  sentVia: { type: String, enum: ['email', 'sms', 'both'], required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IMessageDelivery>('MessageDelivery', MessageDeliverySchema);
