// server/utils/email.js - FIXED VERSION WITH MULTIPLE OPTIONS
const nodemailer = require('nodemailer');

// Option 1: Gmail with App Password (RECOMMENDED)
// Option 2: Ethereal (for testing)
// Option 3: Other SMTP providers

let transporter = null;

const createTransporter = async () => {
  // Check if Gmail credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Setting up Gmail transporter...');
    
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // MUST be App Password, not regular password
        },
        // Add these options for better reliability
        pool: true,
        maxConnections: 1,
        rateDelta: 20000,
        rateLimit: 5
      });

      // Verify connection
      await transporter.verify();
      console.log('Gmail SMTP connection verified successfully');
      return transporter;
    } catch (error) {
      console.error('Gmail SMTP verification failed:', error.message);
      console.log('\nGmail Setup Instructions:');
      console.log('1. Enable 2-Factor Authentication on your Google account');
      console.log('2. Go to: https://myaccount.google.com/apppasswords');
      console.log('3. Create an App Password for "Mail"');
      console.log('4. Use that 16-character password in EMAIL_PASS');
      console.log('5. Your .env should look like:');
      console.log('   EMAIL_USER=your.email@gmail.com');
      console.log('   EMAIL_PASS=abcd efgh ijkl mnop (16 chars, spaces optional)\n');
      
      // Fall back to Ethereal for testing
      console.log('Falling back to Ethereal test email...');
      return await createEtherealTransporter();
    }
  }

  // No credentials - use Ethereal for testing
  console.log('No email credentials found, using Ethereal test email');
  return await createEtherealTransporter();
};

// Ethereal email for testing (creates fake inbox)
const createEtherealTransporter = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    console.log('Ethereal email account created:');
    console.log('   Username:', testAccount.user);
    console.log('   Password:', testAccount.pass);
    console.log('   Preview URL: Check console after sending email\n');
    
    return transporter;
  } catch (error) {
    console.error('Failed to create Ethereal account:', error.message);
    return null;
  }
};

// Initialize transporter on startup
(async () => {
  await createTransporter();
})();

// Send verification email
const sendVerificationEmail = async (email, name, verificationLink) => {
  if (!transporter) {
    console.log('transporter not initialized, attempting to create...');
    await createTransporter();
  }

  if (!transporter) {
    throw new Error('Email service not available. Please configure email settings.');
  }

  const mailOptions = {
    from: {
      name: 'Limkokwing Career Portal',
      address: process.env.EMAIL_USER || 'noreply@limkokwing.edu'
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
          <h1>Welcome to Limkokwing Career Portal!</h1>
          
          <div class="content">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>
            
            <div class="highlight">
              <strong>Action Required:</strong> Please verify your email address to activate your account.
            </div>
            
            <p style="font-size: 16px; color: #666;">
              Thank you for registering with Limkokwing Career Portal. We're excited to have you on board!
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
              This verification link will expire in 24 hours
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
    console.log(`Attempting to send verification email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    
    // If using Ethereal, log the preview URL
    if (info.messageId.includes('ethereal')) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview email at:', previewUrl);
      console.log('   (This is a test email - not sent to real inbox)\n');
    }
    
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Provide detailed error information
    if (error.code === 'EAUTH') {
      console.error('\nAUTHENTICATION ERROR:');
      console.error('Your email credentials are incorrect.');
      console.error('For Gmail, you MUST use an App Password, not your regular password.');
      console.error('Steps:');
      console.error('1. Go to: https://myaccount.google.com/apppasswords');
      console.error('2. Create new App Password for "Mail"');
      console.error('3. Update EMAIL_PASS in .env with the 16-character code\n');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error('\n🌐 CONNECTION ERROR:');
      console.error('Cannot connect to email server.');
      console.error('Check your internet connection and firewall settings.\n');
    }
    
    throw error;
  }
};

// Send notification email
const sendNotificationEmail = async (email, subject, message) => {
  if (!transporter) {
    await createTransporter();
  }

  if (!transporter) {
    console.log('Notification would be sent to:', email);
    return;
  }

  const mailOptions = {
    from: {
      name: 'Limkokwing Career Portal',
      address: process.env.EMAIL_USER || 'noreply@limkokwing.edu'
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
    
    if (info.messageId.includes('ethereal')) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📬 Preview at:', previewUrl);
    }
    
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
      subject: '🎉 Congratulations! You\'ve Been Admitted',
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
  console.log('\n=== EMAIL CONFIGURATION TEST ===');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Set (length: ' + process.env.EMAIL_PASS?.length + ')' : '✗ Missing');
  
  if (!transporter) {
    console.log('Transporter not initialized, creating...');
    await createTransporter();
  }

  if (!transporter) {
    console.log('❌ Email service not configured properly\n');
    return false;
  }

  try {
    await transporter.verify();
    console.log('Email server is ready to send messages\n');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
    console.log('');
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail,
  sendApplicationStatusEmail,
  testEmailConfig,
  createTransporter
};