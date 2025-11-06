// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const institutionRoutes = require('./routes/institution');
const studentRoutes = require('./routes/student');
const companyRoutes = require('./routes/company');
const teamRoutes = require('./routes/team'); // ADD THIS

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api', teamRoutes); // ADD THIS - Note: it's just /api because routes include /public/team

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Career Guidance Platform API is running!' });
});
// Add this to server/server.js (before the error handling middleware)

// Test email configuration endpoint
app.get('/test-email', async (req, res) => {
  const { testEmailConfig, sendVerificationEmail } = require('./utils/email');
  
  console.log('\n=== EMAIL CONFIGURATION TEST ===');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Set (length: ' + process.env.EMAIL_PASS?.length + ')' : '✗ Missing');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000 (default)');
  
  const isConfigured = await testEmailConfig();
  
  if (!isConfigured) {
    return res.json({ 
      success: false,
      error: 'Email service not configured properly',
      details: {
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing',
        note: 'Check your .env file'
      }
    });
  }

  try {
    console.log('\n📧 Attempting to send test email...');
    await sendVerificationEmail(
      process.env.EMAIL_USER, // Send to yourself for testing
      'Test User',
      'http://localhost:3000/verify-email?token=test123&uid=test456'
    );
    
    console.log('Test email sent successfully!\n');
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully! Check your inbox: ' + process.env.EMAIL_USER,
      note: 'Check backend console for detailed logs'
    });
  } catch (error) {
    console.error('test email failed:', error.message);
    console.error('Stack:', error.stack);
    
    res.json({ 
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        command: error.command,
        response: error.response
      },
      troubleshooting: [
        'Make sure 2FA is enabled on your Google account',
        'Verify you are using an App Password (not regular password)',
        'Check if your network allows SMTP connections (port 587/465)',
        'Try using Ethereal email for testing: https://ethereal.email'
      ]
    });
  }
});

// Quick status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      firebaseConfigured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY)
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});