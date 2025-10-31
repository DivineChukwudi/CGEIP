// server/utils/email.js
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send verification email
const sendVerificationEmail = async (email, name, verificationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email - Limkokwing Career Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Limkokwing Career Portal!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationLink}</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Limkokwing Career Guidance Platform<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

// Send notification email
const sendNotificationEmail = async (email, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>${message}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Limkokwing Career Guidance Platform<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail
};