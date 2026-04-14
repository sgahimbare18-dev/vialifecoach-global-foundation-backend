const nodemailer = require('nodemailer');

const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const useSsl = String(process.env.EMAIL_USE_SSL || '').toLowerCase() === 'true';
  const useTls = String(process.env.EMAIL_USE_TLS || '').toLowerCase() === 'true';

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: useSsl || port === 465,
    auth: {
      user: process.env.EMAIL_HOST_USER,
      pass: process.env.EMAIL_HOST_PASSWORD,
    },
    requireTLS: useTls,
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000
  });
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const fromAddress = process.env.DEFAULT_FROM_EMAIL || `${process.env.FROM_NAME || 'Vialifecoach Global Foundation'} <${process.env.EMAIL_HOST_USER || process.env.EMAIL_USER}>`;
    const mailOptions = {
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  bookingConfirmation: (booking) => ({
    subject: 'Coaching Session Booking Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Booking Confirmed!</h2>
        <p>Dear ${booking.name},</p>
        <p>Your coaching session has been successfully booked!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Program:</strong> ${booking.program}</p>
          <p><strong>Date:</strong> ${booking.preferredDate}</p>
          <p><strong>Time:</strong> ${booking.preferredTime}</p>
        </div>
        <p>We will contact you soon to confirm the exact details.</p>
        <p>Best regards,<br>Vialifecoach Global Foundation</p>
      </div>
    `,
    text: `Dear ${booking.name},\n\nYour coaching session has been successfully booked!\n\nProgram: ${booking.program}\nDate: ${booking.preferredDate}\nTime: ${booking.preferredTime}\n\nWe will contact you soon to confirm the exact details.\n\nBest regards,\nVialifecoach Global Foundation`
  }),

  applicationReceived: (application) => ({
    subject: 'Application Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Application Received</h2>
        <p>Dear ${application.name},</p>
        <p>Thank you for your interest in ${application.type === 'volunteer' ? 'volunteering' : 'partnering'} with Vialifecoach Global Foundation.</p>
        <p>We have received your application and our team will review it carefully.</p>
        <p>We'll get back to you within 5-7 business days.</p>
        <p>Best regards,<br>The Vialifecoach Team</p>
      </div>
    `,
    text: `Dear ${application.name},\n\nThank you for your interest in ${application.type === 'volunteer' ? 'volunteering' : 'partnering'} with Vialifecoach Global Foundation.\n\nWe have received your application and our team will review it carefully.\n\nWe'll get back to you within 5-7 business days.\n\nBest regards,\nThe Vialifecoach Team`
  }),

  contactForm: (contact) => ({
    subject: 'Thank you for contacting Vialifecoach Global Foundation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Thank You for Reaching Out!</h2>
        <p>Dear ${contact.name},</p>
        <p>We have received your message and will get back to you within 24-48 hours.</p>
        <p><strong>Your message:</strong></p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          ${contact.message}
        </div>
        <p>Best regards,<br>Vialifecoach Global Foundation Team</p>
      </div>
    `,
    text: `Dear ${contact.name},\n\nWe have received your message and will get back to you within 24-48 hours.\n\nYour message:\n${contact.message}\n\nBest regards,\nVialifecoach Global Foundation Team`
  }),

  partnershipInquiry: (partnership) => ({
    subject: 'Partnership Inquiry Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Partnership Inquiry Received</h2>
        <p>Dear ${partnership.contactPerson},</p>
        <p>Thank you for your interest in partnering with Vialifecoach Global Foundation.</p>
        <p>We have received your partnership inquiry and our team will review it within 3-5 business days.</p>
        <p>We will contact you at ${partnership.email} to discuss the next steps.</p>
        <p>Best regards,<br>Partnership Team<br>Vialifecoach Global Foundation</p>
      </div>
    `,
    text: `Dear ${partnership.contactPerson},\n\nThank you for your interest in partnering with Vialifecoach Global Foundation.\n\nWe have received your partnership inquiry and our team will review it within 3-5 business days.\n\nWe will contact you at ${partnership.email} to discuss the next steps.\n\nBest regards,\nPartnership Team\nVialifecoach Global Foundation`
  }),

  newsletterWelcome: (subscriber) => ({
    subject: 'Welcome to Vialifecoach Newsletter',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Our Newsletter!</h2>
        <p>Thank you for subscribing to the Vialifecoach Global Foundation newsletter.</p>
        <p>You will now receive updates about our programs, events, and impact stories.</p>
        <p>If you wish to unsubscribe at any time, you can click the unsubscribe link in any of our emails.</p>
        <p>Best regards,<br>Vialifecoach Global Foundation Team</p>
      </div>
    `,
    text: `Thank you for subscribing to the Vialifecoach Global Foundation newsletter.\n\nYou will now receive updates about our programs, events, and impact stories.\n\nIf you wish to unsubscribe at any time, you can click the unsubscribe link in any of our emails.\n\nBest regards,\nVialifecoach Global Foundation Team`
  }),

  donationReceipt: (donation) => ({
    subject: 'Thank you for your donation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Donation Receipt</h2>
        <p>Dear ${donation.donor_name || 'Supporter'},</p>
        <p>Thank you for your generous donation to Vialifecoach Global Foundation. Your support helps us create safe spaces for healing and transformation.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Donation Details:</h3>
          <p><strong>Amount:</strong> ${donation.currency} ${donation.amount}</p>
          <p><strong>Frequency:</strong> ${donation.frequency}</p>
          <p><strong>Payment Method:</strong> ${donation.payment_method}</p>
          <p><strong>Status:</strong> ${donation.status}</p>
          <p><strong>Reference:</strong> ${donation.provider_reference || donation.id}</p>
          <p><strong>Date:</strong> ${new Date(donation.updated_at || donation.created_at || Date.now()).toLocaleString()}</p>
        </div>
        <p>If you have any questions about your donation, reply to this email and we will be happy to help.</p>
        <p>With gratitude,<br>Vialifecoach Global Foundation Team</p>
      </div>
    `,
    text: `Dear ${donation.donor_name || 'Supporter'},\n\nThank you for your generous donation to Vialifecoach Global Foundation.\n\nDonation Details:\nAmount: ${donation.currency} ${donation.amount}\nFrequency: ${donation.frequency}\nPayment Method: ${donation.payment_method}\nStatus: ${donation.status}\nReference: ${donation.provider_reference || donation.id}\nDate: ${new Date(donation.updated_at || donation.created_at || Date.now()).toLocaleString()}\n\nWith gratitude,\nVialifecoach Global Foundation Team`
  })
};

module.exports = { sendEmail, emailTemplates };
