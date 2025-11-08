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
const teamRoutes = require('./routes/team');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 5000;

// ===================================
// UPDATED CORS CONFIGURATION
// ===================================
// server/server.js - UPDATED CORS SECTION

// ===================================
// FIXED CORS CONFIGURATION
// ===================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://cgeip.vercel.app',
  'https://cgeip-v7309mq74-divinechukwudi-3003s-projects.vercel.app', // Add this
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For Vercel preview deployments, allow all vercel.app domains
      if (origin && origin.includes('.vercel.app')) {
        console.log('Allowing Vercel preview deployment:', origin);
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api', teamRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Career Guidance Platform API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

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
    console.log('\n Attempting to send test email...');
    
    // Use FRONTEND_URL for the verification link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=test123&uid=test456`;
    
    await sendVerificationEmail(
      process.env.EMAIL_USER,
      'Test User',
      verificationLink
    );
    
    console.log(' Test email sent successfully!\n');
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully! Check your inbox: ' + process.env.EMAIL_USER,
      verificationLink: verificationLink,
      note: 'Check backend console for detailed logs'
    });
  } catch (error) {
    console.error(' Test email failed:', error.message);
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
        'Verify EMAIL_USER and EMAIL_PASS in environment variables'
      ]
    });
  }
});

// Add this route in server.js
app.get('/api/test-email-config', async (req, res) => {
  res.json({
    EMAIL_USER: process.env.EMAIL_USER ? 'Set ' : 'Missing ',
    EMAIL_PASS: process.env.EMAIL_PASS ? 'Set  (length: ' + process.env.EMAIL_PASS.length + ')' : 'Missing ',
    FRONTEND_URL: process.env.FRONTEND_URL || 'Using default',
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
});

// Quick status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      firebaseConfigured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY),
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    },
    allowedOrigins: allowedOrigins
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(' Error:', err.stack);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
});

// Debug environment variables
app.get('/api/debug-env', (req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPass: !!process.env.EMAIL_PASS
  });
});

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║    SERVER STARTED SUCCESSFULLY              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\n Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Email configured: ${!!(process.env.EMAIL_USER && process.env.EMAIL_PASS) ? '✅' : '❌'}`);
  console.log(` Firebase configured: ${!!(process.env.FIREBASE_PROJECT_ID) ? '✅' : '❌'}`);
  console.log(` Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`\n Test endpoints(locally):`);
  console.log(`   • Health: http://localhost:${PORT}/`); 
  console.log(`   • Status: http://localhost:${PORT}/api/status`);
  console.log(`   • Email Test: http://localhost:${PORT}/test-email`);
  console.log('\n');
  console.log(`\n Test endpoints(Production):`);
  console.log(`   • Health: https://cgeip.onrender.com/`); 
  console.log(`   • Status: https://cgeip.onrender.com/api/status`);
  console.log(`   • Email Test: https://cgeip.onrender.com/test-email`);
  console.log('\n');
});