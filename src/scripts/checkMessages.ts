import mongoose from 'mongoose';
import Message from '../models/Message';
import MessageTracker from '../models/MessageTracker';
import dotenv from 'dotenv';

dotenv.config();

const checkMessages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/psychology-app');
    console.log('Connected to MongoDB');

    // Check message count
    const messageCount = await Message.countDocuments();
    console.log('Total messages in database:', messageCount);

    if (messageCount > 0) {
      const sampleMessage = await Message.findOne();
      console.log('Sample message:', {
        category: sampleMessage?.category,
        activity: sampleMessage?.activity?.substring(0, 50),
        affirmation: sampleMessage?.affirmation?.substring(0, 50),
        dayNumber: sampleMessage?.dayNumber,
        batchName: sampleMessage?.batchName
      });
    }

    // Check tracker
    const tracker = await MessageTracker.findOne();
    console.log('Tracker:', {
      currentDay: tracker?.currentDay,
      currentBatch: tracker?.currentBatch,
      lastSentDate: tracker?.lastSentDate
    });

    // Check current message
    if (tracker) {
      const currentMessage = await Message.findOne({
        batchName: tracker.currentBatch,
        dayNumber: tracker.currentDay
      });
      console.log('Current message for day', tracker.currentDay, ':', currentMessage ? 'Found' : 'Not found');
      if (currentMessage) {
        console.log('Current message details:', {
          category: currentMessage.category,
          activity: currentMessage.activity?.substring(0, 50),
          affirmation: currentMessage.affirmation?.substring(0, 50)
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkMessages();
