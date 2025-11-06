// server/utils/email.js - FIXED VERSION
const nodemailer = require('nodemailer');

// Create transporter with better error handling
const createTransporter = () => {
  const config = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use App Password, not regular password
    }
  };

  // For development, you can use ethereal email (testing)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Using test mode.');
    return null;
  }

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

// Send verification email
const sendVerificationEmail = async (email, name, verificationLink) => {
  if (!transporter) {
    console.log('Email would be sent to:', email);
    console.log('Verification link:', verificationLink);
    throw new Error('Email service not configured');
  }

  const mailOptions = {
    from: {
      name: 'Limkokwing Career Portal',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Verify Your Email - Limkokwing Career Portal',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
          }
          .content {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 10px;
          }
          h1 {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .verify-btn {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 25px 0;
            font-size: 16px;
          }
          .link-text {
            color: #666;
            font-size: 12px;
            word-break: break-all;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🎓</div>
          <h1>Welcome to Limkokwing Career Portal!</h1>
          
          <div class="content">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>
            <p style="font-size: 16px; color: #666;">
              Thank you for registering with us. We're excited to have you on board!
            </p>
            <p style="font-size: 16px; color: #666;">
              To complete your registration and access all features, please verify your email address by clicking the button below:
            </p>
            
            <a href="${verificationLink}" class="verify-btn">
              Verify Email Address
            </a>
            
            <div class="warning">
              This link will expire in 24 hours
            </div>
            
            <p style="font-size: 14px; color: #999;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <div class="link-text">
              ${verificationLink}
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              If you didn't create an account with us, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>
            <strong>Limkokwing Career Guidance Platform</strong><br>
            Empowering Education & Career Success in Lesotho<br>
            <br>
            This is an automated email, please do not reply.<br>
            For support, contact: support@limkokwing.ac.ls
          </p>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Send notification email
const sendNotificationEmail = async (email, subject, message) => {
  if (!transporter) {
    console.log('Notification would be sent to:', email);
    return;
  }

  const mailOptions = {
    from: {
      name: 'Limkokwing Career Portal',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 30px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
          }
          .content {
            padding: 20px 0;
          }
          .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🎓 Limkokwing Career Portal</h2>
          </div>
          <div class="content">
            <h3>${subject}</h3>
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>
              Limkokwing Career Guidance Platform<br>
              This is an automated email, please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Notification sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Notification sending failed:', error);
    throw error;
  }
};

// Send application status update
const sendApplicationStatusEmail = async (email, name, institutionName, courseName, status) => {
  const statusMessages = {
    admitted: {
      subject: 'Congratulations! You\'ve Been Admitted',
      message: `Great news! You have been admitted to ${courseName} at ${institutionName}. Please log in to your account to view next steps.`,
      color: '#28a745'
    },
    rejected: {
      subject: 'Application Update',
      message: `Thank you for your interest in ${courseName} at ${institutionName}. Unfortunately, we are unable to offer you admission at this time. We encourage you to apply again in the future.`,
      color: '#dc3545'
    },
    pending: {
      subject: 'Application Received',
      message: `Your application for ${courseName} at ${institutionName} is currently under review. We will notify you once a decision has been made.`,
      color: '#ffc107'
    }
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;

  return sendNotificationEmail(
    email,
    statusInfo.subject,
    `<p>Dear ${name},</p><p>${statusInfo.message}</p>`
  );
};

// Test email configuration
const testEmailConfig = async () => {
  if (!transporter) {
    console.log('Email not configured');
    return false;
  }

  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail,
  sendApplicationStatusEmail,
  testEmailConfig
};