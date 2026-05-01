import cron from 'node-cron';
import User from '../models/User';
import Message from '../models/Message';
import MessageTracker from '../models/MessageTracker';
import MessageDelivery from '../models/MessageDelivery';
import { sendEmail } from '../services/emailService';
import { sendSMS } from '../services/smsService';

const sendDailyMessages = async () => {
  console.log('Starting daily message send...');
  
  try {
    // Get current tracker
    let tracker = await MessageTracker.findOne();
    if (!tracker) {
      tracker = new MessageTracker();
      await tracker.save();
    }

    // Get current message
    const message = await Message.findOne({
      batchName: tracker.currentBatch,
      dayNumber: tracker.currentDay
    });

    if (!message) {
      console.log('No message found for current day');
      return;
    }

    console.log(`Sending message for day ${tracker.currentDay}: ${message.category} - ${message.activity.substring(0, 50)}...`);

    // Get all active subscribers
    const subscribers = await User.find({
      isSubscribed: true,
      subscriptionStatus: 'active'
    });

    console.log(`Found ${subscribers.length} active subscribers`);

    let emailCount = 0;
    let smsCount = 0;
    let errors = 0;

    for (const subscriber of subscribers) {
      try {
        // Format message with category, activity, and affirmation
        const messageText = `Today's Theme: ${message.category}\n\nToday's Activity: ${message.activity}\n\nToday's Affirmation: ${message.affirmation}`;

        // Send email if subscribed
        if (subscriber.subscriptionType === 'email' || subscriber.subscriptionType === 'both') {
          await sendEmail(subscriber.email, 'Daily Positive Psychology Activity', messageText);
          emailCount++;
          
          // Log delivery
          await MessageDelivery.create({
            userId: subscriber._id,
            userEmail: subscriber.email,
            userSubscriptionType: subscriber.subscriptionType,
            messageDayNumber: message.dayNumber,
            messageBatchName: message.batchName,
            category: message.category,
            activity: message.activity,
            affirmation: message.affirmation,
            sentDate: new Date(),
            sentVia: subscriber.subscriptionType === 'both' ? 'both' : 'email',
            status: 'sent'
          });
        }

        // Send SMS if subscribed and has phone number
        if ((subscriber.subscriptionType === 'sms' || subscriber.subscriptionType === 'both') && subscriber.phone) {
          await sendSMS(subscriber.phone, messageText);
          smsCount++;
          
          // Log delivery
          if (subscriber.subscriptionType === 'sms') {
            await MessageDelivery.create({
              userId: subscriber._id,
              userEmail: subscriber.email,
              userSubscriptionType: subscriber.subscriptionType,
              messageDayNumber: message.dayNumber,
              messageBatchName: message.batchName,
              category: message.category,
              activity: message.activity,
              affirmation: message.affirmation,
              sentDate: new Date(),
              sentVia: 'sms',
              status: 'sent'
            });
          }
        }
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        errors++;
        
        // Log failed delivery
        await MessageDelivery.create({
          userId: subscriber._id,
          userEmail: subscriber.email,
          userSubscriptionType: subscriber.subscriptionType,
          messageDayNumber: message.dayNumber,
          messageBatchName: message.batchName,
          category: message.category,
          activity: message.activity,
          affirmation: message.affirmation,
          sentDate: new Date(),
          sentVia: subscriber.subscriptionType,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Mark message as sent
    message.isSent = true;
    message.sentDate = new Date();
    await message.save();

    // Update tracker
    tracker.currentDay++;
    tracker.lastSentDate = new Date();
    tracker.totalMessagesSent += emailCount + smsCount;
    await tracker.save();

    console.log(`Daily send complete: ${emailCount} emails, ${smsCount} SMS, ${errors} errors`);
  } catch (error) {
    console.error('Daily message send error:', error);
  }
};

// Schedule daily message at 9 AM
cron.schedule('0 9 * * *', () => {
  console.log('Running daily message cron job');
  sendDailyMessages();
});

// Run immediately for testing (comment out in production)
// sendDailyMessages();

console.log('Daily message scheduler initialized');
