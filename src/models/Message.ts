import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  category: string;
  activity: string;
  affirmation: string;
  dayNumber: number;
  batchName: string;
  sentDate?: Date;
  isSent: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  category: { type: String, required: true },
  activity: { type: String, required: true },
  affirmation: { type: String, required: true },
  dayNumber: { type: Number, required: true },
  batchName: { type: String, required: true },
  sentDate: { type: Date },
  isSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IMessage>('Message', MessageSchema);
