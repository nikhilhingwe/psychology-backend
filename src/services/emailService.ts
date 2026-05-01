import emailjs from '@emailjs/nodejs';

export const sendEmail = async (to: string, subject: string, content: string) => {
  try {
    // Send email using EmailJS
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID || 'service_o56igqc',
      process.env.EMAILJS_TEMPLATE_ID || 'template_nl46izg',
      {
        to_email: to,
        from_email: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
        subject,
        content
      },
      {
        privateKey: process.env.EMAILJS_PRIVATE_KEY || 'v2lgptbyGVLP_cOncvE9p',
        publicKey: process.env.EMAILJS_PUBLIC_KEY || 'iKaM8hYlUWeIUujWO'
      }
    );

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};
