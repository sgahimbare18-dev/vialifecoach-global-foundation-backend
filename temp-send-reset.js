const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const crypto = require('crypto');
const { sendEmail } = require('./utils/mailer');

(async () => {
  const token = crypto.randomBytes(24).toString('hex');
  const resetUrl = 'https://vialifecoach.org/reset-password?token=' + encodeURIComponent(token);
  const html = `<p>Hello,</p><p>You requested to reset your password. Click the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`;
  const text = `Reset your password using this link: ${resetUrl}`;

  try {
    const info = await sendEmail({
      to: 'sgahimbare18@gmail.com',
      subject: 'Password Reset Request - Vialifecoach',
      html,
      text
    });
    console.log('sent', info.messageId);
    console.log('resetUrl', resetUrl);
  } catch (error) {
    console.error('send failed', error);
    process.exit(1);
  }
})();
