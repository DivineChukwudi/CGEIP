// server/utils/email.js - SENDGRID VERSION
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log(' SendGrid initialized successfully');
} else {
  console.warn('  SENDGRID_API_KEY not found in environment variables');
}

// Your verified sender email (the one you verified in SendGrid)
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'chukwudidivine20@gmail.com';

// Send verification email
const sendVerificationEmail = async (email, name, verificationLink) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error(' SendGrid API key not configured');
    throw new Error('Email service not configured');
  }

  const msg = {
    to: email,
    from: {
      email: SENDER_EMAIL,
      name: 'Career Portal'
    },
    subject: 'Verify Your Email - Career Portal',
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
            background-color: #f5f5f5;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .content {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
            text-align: left;
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
          .verify-btn:hover {
            opacity: 0.9;
          }
          .link-text {
            color: #666;
            font-size: 12px;
            word-break: break-all;
            margin-top: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
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
            text-align: center;
          }
          .highlight {
            background: #e7f3ff;
            padding: 15px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🎓</div>
          <h1>Welcome to Career Portal!</h1>
          
          <div class="content">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>
            
            <div class="highlight">
              <strong>Action Required:</strong> Please verify your email address to activate your account.
            </div>
            
            <p style="font-size: 16px; color: #666;">
              Thank you for registering with Career Portal. We're excited to have you on board!
            </p>
            
            <p style="font-size: 16px; color: #666;">
              To complete your registration and access all features, click the button below:
            </p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="verify-btn">
                Verify Email Address
              </a>
            </div>
            
            <div class="warning">
              ⏰ This verification link will expire in 24 hours
            </div>
            
            <p style="font-size: 14px; color: #999;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <div class="link-text">
              ${verificationLink}
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              <strong>Didn't create an account?</strong><br>
              If you didn't register for this account, please ignore this email or contact our support team.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>
            <strong>Career Guidance Platform</strong><br>
            Empowering Education & Career Success<br>
            <br>
            This is an automated email, please do not reply.<br>
            For support, contact: ${SENDER_EMAIL}
          </p>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log(` Sending verification email to: ${email}`);
    await sgMail.send(msg);
    console.log(' Verification email sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error(' SendGrid error:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.statusCode);
      console.error('   Body:', error.response.body);
    }
    
    throw error;
  }
};

// Send notification email
const sendNotificationEmail = async (email, subject, message) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error(' SendGrid API key not configured');
    throw new Error('Email service not configured');
  }

  const msg = {
    to: email,
    from: {
      email: SENDER_EMAIL,
      name: 'Career Portal'
    },
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
            <h2 style="margin: 0;">🎓 Career Portal</h2>
          </div>
          <div class="content">
            <h3>${subject}</h3>
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>
              Career Guidance Platform<br>
              This is an automated email, please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log(`Sending notification to: ${email}`);
    await sgMail.send(msg);
    console.log('Notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error(' SendGrid notification error:', error.message);
    if (error.response) {
      console.error('   Body:', error.response.body);
    }
    throw error;
  }
};

// Send application status update
const sendApplicationStatusEmail = async (email, name, institutionName, courseName, status) => {
  const statusMessages = {
    admitted: {
      subject: 'Congratulations! You\'ve Been Admitted',
      message: `Great news, ${name}! You have been <strong>admitted</strong> to ${courseName} at ${institutionName}. Please log in to your account to view next steps and accept your offer.`,
      color: '#28a745'
    },
    rejected: {
      subject: '📝 Application Update',
      message: `Dear ${name}, thank you for your interest in ${courseName} at ${institutionName}. Unfortunately, we are unable to offer you admission at this time. We encourage you to explore other programs or apply again in the future.`,
      color: '#dc3545'
    },
    pending: {
      subject: '⏳ Application Received',
      message: `Dear ${name}, your application for ${courseName} at ${institutionName} has been received and is currently under review. We will notify you once a decision has been made.`,
      color: '#ffc107'
    },
    waitlisted: {
      subject: '📋 You\'ve Been Added to the Waiting List',
      message: `Dear ${name}, your application for ${courseName} at ${institutionName} has been placed on the waiting list. We will notify you if a spot becomes available.`,
      color: '#17a2b8'
    }
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;

  return sendNotificationEmail(
    email,
    statusInfo.subject,
    `<p>${statusInfo.message}</p>`
  );
};

// Test email configuration
const testEmailConfig = async () => {
  console.log('\n=== SENDGRID CONFIGURATION TEST ===');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✓ Set (length: ' + process.env.SENDGRID_API_KEY?.length + ')' : '✗ Missing');
  console.log('SENDER_EMAIL:', SENDER_EMAIL);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid API key not configured\n');
    return false;
  }

  console.log('SendGrid is configured\n');
  return true;
};

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail,
  sendApplicationStatusEmail,
  testEmailConfig
};