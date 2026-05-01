import twilio from 'twilio';

export const sendSMS = async (to: string, content: string) => {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Your Daily Positive Psychology Activity:\n\n${content}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    console.log(`SMS sent to ${to}`);
  } catch (error) {
    console.error('SMS error:', error);
    throw error;
  }
};
