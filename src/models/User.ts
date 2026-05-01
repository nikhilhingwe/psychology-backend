import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  isAdmin: boolean;
  isSubscribed: boolean;
  subscriptionType: 'email' | 'sms' | 'both';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: 'active' | 'canceled' | 'past_due';
  subscriptionEndDate?: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isSubscribed: { type: Boolean, default: false },
  subscriptionType: { type: String, enum: ['email', 'sms', 'both'], default: 'email' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  subscriptionStatus: { type: String, enum: ['active', 'canceled', 'past_due'], default: 'active' },
  subscriptionEndDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
