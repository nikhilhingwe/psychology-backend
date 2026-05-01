import express from 'express';
import Stripe from 'stripe';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Price IDs - you'll need to create these in Stripe Dashboard
    const priceId = process.env.STRIPE_PRICE_ID || 'price_your_price_id';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/cancel`,
      metadata: { userId: user._id.toString() }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Payment error', error });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: any, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          isSubscribed: true,
          stripeSubscriptionId: session.subscription as string,
          subscriptionStatus: 'active'
        });
      }
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { isSubscribed: false, subscriptionStatus: 'canceled' }
      );
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      await User.findOneAndUpdate(
        { stripeSubscriptionId: failedInvoice.subscription as string },
        { subscriptionStatus: 'past_due' }
      );
      break;
  }

  res.json({ received: true });
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription' });
    }

    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    
    user.isSubscribed = false;
    user.subscriptionStatus = 'canceled';
    await user.save();

    res.json({ message: 'Subscription canceled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
