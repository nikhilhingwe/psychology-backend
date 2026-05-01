import mongoose from 'mongoose';
import Message from '../models/Message';
import dotenv from 'dotenv';

dotenv.config();

const clearMessages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/psychology-app');
    console.log('Connected to MongoDB');

    const result = await Message.deleteMany({});
    console.log(`Deleted ${result.deletedCount} messages`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

clearMessages();
