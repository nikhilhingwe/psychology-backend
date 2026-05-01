import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageTracker extends Document {
  currentDay: number;
  currentBatch: string;
  lastSentDate: Date;
  totalMessagesSent: number;
}

const MessageTrackerSchema: Schema = new Schema({
  currentDay: { type: Number, default: 1 },
  currentBatch: { type: String, default: 'Batch 1' },
  lastSentDate: { type: Date, default: Date.now },
  totalMessagesSent: { type: Number, default: 0 }
});

export default mongoose.model<IMessageTracker>('MessageTracker', MessageTrackerSchema);
