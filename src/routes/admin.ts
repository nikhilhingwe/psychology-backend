import express from 'express';
import User from '../models/User';
import Message from '../models/Message';
import MessageTracker from '../models/MessageTracker';
import MessageDelivery from '../models/MessageDelivery';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 50, search, subscriptionType, isSubscribed, subscriptionStatus } = req.query;
    
    const query: any = {};
    if (search && search !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (subscriptionType && subscriptionType !== '') query.subscriptionType = subscriptionType;
    if (isSubscribed !== undefined && isSubscribed !== '') query.isSubscribed = isSubscribed === 'true';
    if (subscriptionStatus && subscriptionStatus !== '') query.subscriptionStatus = subscriptionStatus;

    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get all messages
router.get('/messages', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 50, search, batchName, isSent } = req.query;
    
    const query: any = {};
    if (search) {
      query.$or = [
        { category: { $regex: search, $options: 'i' } },
        { activity: { $regex: search, $options: 'i' } },
        { affirmation: { $regex: search, $options: 'i' } }
      ];
    }
    if (batchName) query.batchName = batchName;
    if (isSent !== undefined) query.isSent = isSent === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    
    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ dayNumber: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Message.countDocuments(query)
    ]);

    res.json({
      messages,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Bulk delete messages
router.post('/messages/bulk-delete', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    await Message.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Messages deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get message tracker
router.get('/tracker', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    let tracker = await MessageTracker.findOne();
    if (!tracker) {
      tracker = new MessageTracker();
      await tracker.save();
    }
    res.json(tracker);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update message tracker
router.put('/tracker', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { currentDay, currentBatch } = req.body;
    let tracker = await MessageTracker.findOne();
    
    if (!tracker) {
      tracker = new MessageTracker();
    }

    if (currentDay !== undefined) tracker.currentDay = currentDay;
    if (currentBatch) tracker.currentBatch = currentBatch;
    
    await tracker.save();
    res.json(tracker);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update user
router.put('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, subscriptionType, isSubscribed, subscriptionStatus, isAdmin } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, subscriptionType, isSubscribed, subscriptionStatus, isAdmin },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Send manual message to users
router.post('/send-message', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { category, activity, affirmation, targetSubscriptionType, selectedUsers } = req.body;

    if (!category || !activity || !affirmation) {
      return res.status(400).json({ message: 'Category, activity, and affirmation are required' });
    }

    // Format message
    const messageText = `Today's Theme: ${category}\n\nToday's Activity: ${activity}\n\nToday's Affirmation: ${affirmation}`;

    // Get subscribers
    let subscribers;
    if (selectedUsers && selectedUsers.length > 0) {
      // Send to specific users
      subscribers = await User.find({ _id: { $in: selectedUsers } });
    } else {
      // Get subscribers based on target subscription type
      const query: any = {
        isSubscribed: true,
        subscriptionStatus: 'active'
      };

      if (targetSubscriptionType && targetSubscriptionType !== 'all') {
        query.subscriptionType = targetSubscriptionType;
      }

      subscribers = await User.find(query);
    }

    // Import services
    const { sendEmail } = await import('../services/emailService');
    const { sendSMS } = await import('../services/smsService');

    let emailCount = 0;
    let smsCount = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const subscriber of subscribers) {
      try {
        // Send email if subscribed
        if (subscriber.subscriptionType === 'email' || subscriber.subscriptionType === 'both') {
          await sendEmail(subscriber.email, 'Daily Positive Psychology Activity', messageText);
          emailCount++;
          
          // Log delivery
          await MessageDelivery.create({
            userId: subscriber._id,
            userEmail: subscriber.email,
            userSubscriptionType: subscriber.subscriptionType,
            messageDayNumber: 0,
            messageBatchName: 'Manual',
            category,
            activity,
            affirmation,
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
              messageDayNumber: 0,
              messageBatchName: 'Manual',
              category,
              activity,
              affirmation,
              sentDate: new Date(),
              sentVia: 'sms',
              status: 'sent'
            });
          }
        }
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        errors++;
        errorDetails.push({ email: subscriber.email, error: error instanceof Error ? error.message : 'Unknown error' });
        
        // Log failed delivery
        await MessageDelivery.create({
          userId: subscriber._id,
          userEmail: subscriber.email,
          userSubscriptionType: subscriber.subscriptionType,
          messageDayNumber: 0,
          messageBatchName: 'Manual',
          category,
          activity,
          affirmation,
          sentDate: new Date(),
          sentVia: subscriber.subscriptionType,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      message: 'Message sent successfully',
      emailCount,
      smsCount,
      errors,
      totalSubscribers: subscribers.length,
      errorDetails
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get stats
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscribers = await User.countDocuments({ isSubscribed: true });
    const totalMessages = await Message.countDocuments();
    const tracker = await MessageTracker.findOne();

    res.json({
      totalUsers,
      activeSubscribers,
      totalMessages,
      tracker
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get message deliveries
router.get('/deliveries', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 50, status, userEmail } = req.query;
    
    const query: any = {};
    if (status) query.status = status;
    if (userEmail) query.userEmail = { $regex: userEmail, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    
    const [deliveries, total] = await Promise.all([
      MessageDelivery.find(query)
        .sort({ sentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MessageDelivery.countDocuments(query)
    ]);

    res.json({
      deliveries,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete message
router.delete('/messages/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete all messages
router.delete('/messages', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await Message.deleteMany({});
    res.json({ message: 'All messages deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
