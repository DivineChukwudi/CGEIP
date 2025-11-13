const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized successfully');
  console.log('   API Key (first 10 chars):', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');
} else {
  console.warn('⚠️  SENDGRID_API_KEY not found in environment variables');
}

// Your verified sender email (the one you verified in SendGrid)
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'chukwudidivine20@gmail.com';

// Contact form recipient emails
const CONTACT_RECIPIENTS = [
  'chukwudidivine20@gmail.com',
  'thabangmaepe@gmail.com',
  'rea89236@gmail.com'
];

// Send verification email
const sendVerificationEmail = async (email, name, verificationLink) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not configured');
    throw new Error('Email service not configured');
  }

  const msg = {
    to: email,
    from: {
      email: SENDER_EMAIL,
      name: 'Career Portal'
    },
    replyTo: SENDER_EMAIL, // ✅ Important: Helps with deliverability
    subject: 'Verify Your Email - Career Portal',
    // ✅ Anti-spam headers
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'SendGrid API'
    },
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
    console.log(`📧 Sending verification email to: ${email}`);
    console.log(`   From: ${SENDER_EMAIL}`);
    
    const response = await sgMail.send(msg);
    
    console.log('✅ Verification email sent successfully');
    console.log('   Response Status:', response[0].statusCode);
    console.log('   Message ID:', response[0].headers['x-message-id']);
    
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    
    // Enhanced error logging
    if (error.response) {
      console.error('   Status Code:', error.response.statusCode);
      console.error('   Response Body:', JSON.stringify(error.response.body, null, 2));
      
      // Specific error messages
      if (error.response.statusCode === 401) {
        console.error('   💡 FIX: Your SendGrid API key is invalid or expired');
        console.error('      1. Go to https://app.sendgrid.com/settings/api_keys');
        console.error('      2. Create a new API key with "Mail Send" permission');
        console.error('      3. Update your .env file with the new key');
        console.error('      4. Restart your server');
      } else if (error.response.statusCode === 403) {
        console.error('   💡 FIX: Your sender email is not verified');
        console.error('      1. Go to https://app.sendgrid.com/settings/sender_auth');
        console.error('      2. Verify your sender email:', SENDER_EMAIL);
      }
    }
    
    throw error;
  }
};

// Send notification email
const sendNotificationEmail = async (email, subject, message) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not configured');
    throw new Error('Email service not configured');
  }

  const msg = {
    to: email,
    from: {
      email: SENDER_EMAIL,
      name: 'Career Portal'
    },
    replyTo: SENDER_EMAIL, // ✅ Anti-spam
    subject: subject,
    // ✅ Anti-spam headers
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'SendGrid API'
    },
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
    console.log(`📧 Sending notification to: ${email}`);
    const response = await sgMail.send(msg);
    console.log('✅ Notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid notification error:', error.message);
    if (error.response) {
      console.error('   Body:', JSON.stringify(error.response.body, null, 2));
    }
    throw error;
  }
};

// NEW: Send contact form email to admin team
const sendContactFormEmail = async (name, email, subject, message) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not configured');
    throw new Error('Email service not configured');
  }

  const msg = {
    to: CONTACT_RECIPIENTS,
    from: {
      email: SENDER_EMAIL,
      name: 'CGEIP Contact Form'
    },
    replyTo: email, // Allow direct reply to the person who submitted the form
    subject: `CGEIP Contact Form: ${subject}`,
    // ✅ Anti-spam headers
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'SendGrid API',
      'List-Unsubscribe': `<mailto:${SENDER_EMAIL}>`
    },
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
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #1f2937 0%, #4b5563 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content {
            padding: 30px;
          }
          .info-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #4b5563;
          }
          .info-row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .info-label {
            font-weight: 600;
            color: #1f2937;
            min-width: 100px;
            font-size: 14px;
          }
          .info-value {
            color: #4b5563;
            font-size: 14px;
            flex: 1;
            word-break: break-word;
          }
          .message-box {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
          }
          .message-box h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
          }
          .message-content {
            color: #6b7280;
            line-height: 1.8;
            font-size: 15px;
            white-space: pre-wrap;
          }
          .reply-button {
            display: inline-block;
            background: linear-gradient(135deg, #1f2937 0%, #4b5563 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .reply-button:hover {
            opacity: 0.9;
          }
          .footer {
            background: #f9fafb;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 5px 0;
            color: #6b7280;
            font-size: 13px;
          }
          .timestamp {
            background: #e5e7eb;
            color: #4b5563;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 12px;
            display: inline-block;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
            <p>Career Guidance and Employment Integration Platform</p>
            <div class="timestamp">
              📅 ${new Date().toLocaleString('en-US', { 
                dateStyle: 'full', 
                timeStyle: 'short',
                timeZone: 'Africa/Maseru'
              })}
            </div>
          </div>
          
          <div class="content">
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">👤 Name:</span>
                <span class="info-value">${name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📧 Email:</span>
                <span class="info-value"><a href="mailto:${email}" style="color: #4b5563; text-decoration: none; font-weight: 600;">${email}</a></span>
              </div>
              <div class="info-row">
                <span class="info-label">📋 Subject:</span>
                <span class="info-value"><strong>${subject}</strong></span>
              </div>
            </div>

            <div class="message-box">
              <h3>💬 Message Content</h3>
              <div class="message-content">${message}</div>
            </div>

            <div style="text-align: center;">
              <a href="mailto:${email}" class="reply-button">
                ✉️ Reply to ${name.split(' ')[0]}
              </a>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 8px; margin-top: 25px; font-size: 14px;">
              <strong>💡 Quick Tip:</strong> Click "Reply" in your email client to respond directly to ${email}
            </div>
          </div>

          <div class="footer">
            <p><strong>Career Guidance and Employment Integration Platform (CGEIP)</strong></p>
            <p>Limkokwing University of Creative Technology</p>
            <p>Maseru, Lesotho | P.O. Box 11912</p>
            <p style="margin-top: 15px; font-size: 12px;">
              This email was automatically generated from the CGEIP website contact form.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log(`📧 Sending contact form email from: ${name} (${email})`);
    console.log(`   Recipients: ${CONTACT_RECIPIENTS.join(', ')}`);
    console.log(`   Subject: ${subject}`);
    
    const response = await sgMail.send(msg);
    
    console.log('✅ Contact form email sent successfully');
    console.log('   Response Status:', response[0].statusCode);
    console.log('   Message ID:', response[0].headers['x-message-id']);
    
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid contact form error:', error.message);
    
    if (error.response) {
      console.error('   Status Code:', error.response.statusCode);
      console.error('   Response Body:', JSON.stringify(error.response.body, null, 2));
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

// Send job preference reminder email
const sendJobPreferenceReminderEmail = async (email, studentName) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not configured');
    throw new Error('Email service not configured');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const preferencesLink = `${frontendUrl}/dashboard/job-interests`;

  const msg = {
    to: email,
    from: {
      email: SENDER_EMAIL,
      name: 'Career Portal'
    },
    replyTo: SENDER_EMAIL,
    subject: '⚙️ Complete Your Job Preferences - Career Portal',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'SendGrid API'
    },
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
            background: white;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.95;
            font-size: 14px;
          }
          .content {
            padding: 40px;
          }
          .highlight-box {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .highlight-box strong {
            color: #667eea;
          }
          .benefits {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .benefits h3 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
          }
          .benefit-item {
            margin-bottom: 12px;
            padding-left: 25px;
            position: relative;
          }
          .benefit-item:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
          }
          .cta-button {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 25px 0;
            font-size: 16px;
            text-align: center;
          }
          .cta-button:hover {
            opacity: 0.9;
          }
          .link-text {
            color: #666;
            font-size: 12px;
            word-break: break-all;
            margin-top: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .footer {
            background: #f9fafb;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 5px 0;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚙️ Complete Your Job Preferences</h1>
            <p>Help us match you with perfect career opportunities</p>
          </div>
          
          <div class="content">
            <h2 style="color: #333; margin-top: 0;">Hi ${studentName}! 👋</h2>
            
            <p style="font-size: 16px; color: #666;">
              We've noticed that you haven't filled in your job preferences yet. To help us provide you with the best job recommendations tailored to your goals, we need your input!
            </p>
            
            <div class="highlight-box">
              <strong>Why fill in your preferences?</strong>
              <p style="margin: 10px 0 0 0; font-size: 14px;">
                Your job preferences help our intelligent matching system recommend opportunities that align with your career goals, interests, and skills.
              </p>
            </div>
            
            <div class="benefits">
              <h3>What you get:</h3>
              <div class="benefit-item">Personalized job recommendations based on your interests</div>
              <div class="benefit-item">Better matches for your skills and experience level</div>
              <div class="benefit-item">Opportunities in industries you're passionate about</div>
              <div class="benefit-item">Automatic notifications for new relevant positions</div>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; margin: 30px 0;">
              <strong>Take 2 minutes now to fill in your preferences!</strong>
            </p>
            
            <div style="text-align: center;">
              <a href="${preferencesLink}" class="cta-button">
                Open Job Preferences Form
              </a>
            </div>
            
            <div class="link-text">
              Or copy and paste this link into your browser:<br>
              ${preferencesLink}
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              <strong>Need help?</strong><br>
              If you have any questions about filling in your preferences, feel free to contact our support team. We're here to help!
            </p>
          </div>
          
          <div class="footer">
            <p>
              <strong>Career Guidance and Employment Integration Platform (CGEIP)</strong><br>
              Limkokwing University of Creative Technology
            </p>
            <p style="margin-top: 15px;">
              This is an automated email from our job matching system.<br>
              You'll receive this reminder every 3 hours until you fill in your preferences.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log(`📧 Sending job preference reminder to: ${email}`);
    const response = await sgMail.send(msg);
    console.log('   ✅ Email sent successfully (Message ID: ' + response[0].headers['x-message-id'] + ')');
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid job preference email error:', error.message);
    if (error.response) {
      console.error('   Status Code:', error.response.statusCode);
      console.error('   Body:', JSON.stringify(error.response.body, null, 2));
    }
    throw error;
  }
};

// Test email configuration
const testEmailConfig = async () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   SENDGRID CONFIGURATION TEST           ║');
  console.log('╚═══════════════════════════════════════════╝');
  
  const apiKeySet = !!process.env.SENDGRID_API_KEY;
  const apiKeyLength = process.env.SENDGRID_API_KEY?.length || 0;
  const apiKeyPreview = process.env.SENDGRID_API_KEY?.substring(0, 15) + '...' || 'N/A';
  
  console.log('SENDGRID_API_KEY:', apiKeySet ? '✅ Set' : '❌ Missing');
  if (apiKeySet) {
    console.log('  Length:', apiKeyLength, 'characters');
    console.log('  Preview:', apiKeyPreview);
  }
  console.log('SENDER_EMAIL:', SENDER_EMAIL);
  console.log('CONTACT_RECIPIENTS:', CONTACT_RECIPIENTS.join(', '));
  console.log('');
  
  if (!apiKeySet) {
    console.log('❌ SendGrid API key not configured');
    console.log('   Follow these steps:');
    console.log('   1. Go to https://app.sendgrid.com/settings/api_keys');
    console.log('   2. Create a new API key');
    console.log('   3. Add it to your .env file as SENDGRID_API_KEY=your_key');
    console.log('   4. Restart your server\n');
    return false;
  }

  console.log('SendGrid is configured\n');
  return true;
};

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail,
  sendApplicationStatusEmail,
  sendContactFormEmail,
  sendJobPreferenceReminderEmail,
  testEmailConfig
};