// server/test-email.js - Run this script to test email configuration
// Usage: node test-email.js

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   EMAIL CONFIGURATION DIAGNOSTIC TOOL          ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Step 1: Check environment variables
console.log('📋 STEP 1: Checking Environment Variables\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? `✅ ${process.env.EMAIL_USER}` : '❌ NOT SET');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? `✅ Set (${process.env.EMAIL_PASS.length} characters)` : '❌ NOT SET');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '⚠️  Using default: http://localhost:3000');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('\n❌ ERROR: Email credentials not configured!\n');
  console.log('📝 To fix this:');
  console.log('1. Create/edit server/.env file');
  console.log('2. Add these lines:');
  console.log('   EMAIL_USER=your.email@gmail.com');
  console.log('   EMAIL_PASS=your-16-char-app-password');
  console.log('\n🔗 Get App Password: https://myaccount.google.com/apppasswords\n');
  process.exit(1);
}

// Step 2: Create transporter
console.log('\n📧 STEP 2: Creating Email Transporter\n');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true, // Show SMTP traffic
  logger: true  // Log information
});

// Step 3: Verify connection
console.log('🔌 STEP 3: Verifying SMTP Connection\n');

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP Connection Failed!\n');
    console.error('Error:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:\n');
    
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication Failed:');
      console.log('   - You are using regular password (WRONG!)');
      console.log('   - You need App Password (16 characters)');
      console.log('   - Steps:');
      console.log('     1. Enable 2FA: https://myaccount.google.com/security');
      console.log('     2. Create App Password: https://myaccount.google.com/apppasswords');
      console.log('     3. Use that password in EMAIL_PASS\n');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.log('🌐 Connection Timeout:');
      console.log('   - Check internet connection');
      console.log('   - Check firewall (allow port 587)');
      console.log('   - Try different network (mobile hotspot)\n');
    } else {
      console.log('📞 Unknown Error:');
      console.log('   - Full error:', error);
      console.log('   - Try using Ethereal for testing');
      console.log('   - Or try different email provider\n');
    }
    
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!\n');
    
    // Step 4: Send test email
    console.log('📬 STEP 4: Sending Test Email\n');
    
    const mailOptions = {
      from: {
        name: 'Career Guidance and Employment Integration Platform - Test',
        address: process.env.EMAIL_USER
      },
      to: process.env.EMAIL_USER, // Send to yourself
      subject: '✅ Email Configuration Test - SUCCESS!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Success!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your email configuration is working perfectly!</p>
          </div>
          
          <div style="background: white; padding: 30px; margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0;">Email Test Results</h2>
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <strong style="color: #059669;">✅ All Systems Operational</strong>
              <p style="margin: 10px 0 0 0; color: #065f46;">Your email service is configured correctly and ready to send emails.</p>
            </div>
            
            <h3 style="color: #333;">Configuration Details:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>Email Service:</strong> Gmail SMTP</li>
              <li><strong>From Address:</strong> ${process.env.EMAIL_USER}</li>
              <li><strong>Authentication:</strong> App Password</li>
              <li><strong>Status:</strong> Connected ✅</li>
            </ul>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <strong style="color: #1d4ed8;">📋 Next Steps:</strong>
              <ol style="margin: 10px 0 0 0; color: #1e40af; line-height: 1.8;">
                <li>Start your server: <code style="background: #dbeafe; padding: 2px 8px; border-radius: 4px;">npm start</code></li>
                <li>Register a new user</li>
                <li>Check email inbox for verification email</li>
                <li>Click verification link</li>
                <li>Login to your account</li>
              </ol>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Test Timestamp:</strong> ${new Date().toLocaleString()}<br>
              <strong>Server:</strong> Career Guidance and Employment Integration Platform<br>
              <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
            </p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Failed to Send Test Email\n');
        console.error('Error:', error.message);
        process.exit(1);
      } else {
        console.log('✅ Test Email Sent Successfully!\n');
        console.log('📧 Details:');
        console.log('   Message ID:', info.messageId);
        console.log('   From:', process.env.EMAIL_USER);
        console.log('   To:', process.env.EMAIL_USER);
        console.log('   Response:', info.response);
        console.log('\n📬 Check your inbox (and spam folder)!');
        console.log('   Email should arrive within 1-2 minutes.\n');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║   ✅ EMAIL CONFIGURATION IS WORKING!          ║');
        console.log('╚════════════════════════════════════════════════╝\n');
        process.exit(0);
      }
    });
  }
});