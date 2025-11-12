require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ===================================
// LOG ENVIRONMENT ON STARTUP
// ===================================
console.log('\n╔═══════════════════════════════════════════╗');
console.log('║   ENVIRONMENT VARIABLES CHECK           ║');
console.log('╚═══════════════════════════════════════════╝');
console.log('PORT:', PORT);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? `✅ Set (${process.env.SENDGRID_API_KEY.length} chars, starts: ${process.env.SENDGRID_API_KEY.substring(0, 10)}...)` : '❌ Missing');
console.log('SENDER_EMAIL:', process.env.SENDER_EMAIL || '❌ Not set');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000 (default)');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('');

// ===================================
// INITIALIZE FIREBASE
// ===================================
let firebaseInitialized = false;
try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

// ===================================
// CORS CONFIGURATION - FIXED
// ===================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'https://cgeip.vercel.app',
  'https://cgeip-v7309mq74-divinechukwudi-3003s-projects.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log('📋 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('🔍 Checking CORS for origin:', origin);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ Origin allowed from list:', origin);
      return callback(null, true);
    }
    
    // Allow all Vercel preview deployments
    if (origin && origin.includes('.vercel.app')) {
      console.log('✅ Allowing Vercel deployment:', origin);
      return callback(null, true);
    }
    
    // If we get here, block it
    console.log('❌ CORS blocked origin:', origin);
    console.log('   Allowed origins:', allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
}));

// ===================================
// MIDDLEWARE
// ===================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ===================================
// HEALTH & TEST ROUTES
// ===================================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Career Guidance Platform API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      firebaseConfigured: firebaseInitialized,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    },
    allowedOrigins: allowedOrigins
  });
});

// Test SendGrid email configuration
app.get('/test-email', async (req, res) => {
  const { testEmailConfig, sendVerificationEmail } = require('./utils/email');
  
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   SENDGRID EMAIL TEST                   ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? `✅ Set (${process.env.SENDGRID_API_KEY.length} chars)` : '❌ Missing');
  console.log('SENDER_EMAIL:', process.env.SENDER_EMAIL || '❌ Missing');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
  console.log('');
  
  const isConfigured = await testEmailConfig();
  
  if (!isConfigured) {
    return res.json({ 
      success: false,
      error: 'SendGrid not configured properly',
      details: {
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'Set' : 'Missing',
        SENDER_EMAIL: process.env.SENDER_EMAIL ? 'Set' : 'Missing',
        note: 'Check your .env file'
      }
    });
  }

  try {
    console.log('📧 Attempting to send test email...');
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=test123&uid=test456`;
    const testEmail = process.env.SENDER_EMAIL || 'test@example.com';
    
    await sendVerificationEmail(
      testEmail,
      'Test User',
      verificationLink
    );
    
    console.log('✅ Test email sent successfully!\n');
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully! Check your inbox: ' + testEmail,
      verificationLink: verificationLink,
      sentTo: testEmail
    });
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    
    res.json({ 
      success: false,
      error: error.message,
      details: error.response?.body || 'No additional details',
      troubleshooting: [
        'Verify your SendGrid API key is valid',
        'Check if sender email is verified in SendGrid',
        'Ensure API key has "Mail Send" permission',
        'Visit https://app.sendgrid.com/settings/api_keys'
      ]
    });
  }
});

// Test Cloudinary configuration
app.get('/test-cloudinary', async (req, res) => {
  const { testCloudinaryConnection } = require('./utils/cloudinaryUpload');
  
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   CLOUDINARY CONFIGURATION TEST         ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
  
  const isConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                      process.env.CLOUDINARY_API_KEY && 
                      process.env.CLOUDINARY_API_SECRET;
  
  if (!isConfigured) {
    return res.json({ 
      success: false,
      error: 'Cloudinary not configured',
      details: {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
      },
      instructions: [
        '1. Go to https://cloudinary.com/users/register/free',
        '2. Sign up for a FREE account',
        '3. Go to Dashboard: https://console.cloudinary.com/',
        '4. Copy your Cloud Name, API Key, and API Secret',
        '5. Add them to your .env file',
        '6. Restart your server'
      ]
    });
  }

  try {
    const connected = await testCloudinaryConnection();
    
    if (connected) {
      console.log('✅ Cloudinary test successful!\n');
      
      res.json({ 
        success: true, 
        message: 'Cloudinary is configured correctly and connected!',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKeyPreview: process.env.CLOUDINARY_API_KEY?.substring(0, 5) + '...'
      });
    } else {
      throw new Error('Connection test failed');
    }
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    
    res.json({ 
      success: false,
      error: error.message,
      troubleshooting: [
        'Verify your Cloudinary credentials are correct',
        'Check if your API key has the correct permissions',
        'Ensure your account is active',
        'Visit https://console.cloudinary.com/ to verify'
      ]
    });
  }
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    sendGridKeyLength: process.env.SENDGRID_API_KEY?.length || 0,
    sendGridKeyPreview: process.env.SENDGRID_API_KEY?.substring(0, 15) + '...' || 'N/A',
    senderEmail: process.env.SENDER_EMAIL || 'NOT SET'
  });
});

// ===================================
// IMPORT & MOUNT ROUTES
// ===================================
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const institutionRoutes = require('./routes/institution');
const studentRoutes = require('./routes/student');
const companyRoutes = require('./routes/company');
const teamRoutes = require('./routes/team');
const publicRoutes = require('./routes/public');
const contactRoutes = require('./routes/contact');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api', teamRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', contactRoutes);
app.use('/api/notifications', notificationRoutes);

// ===================================
// ERROR HANDLERS
// ===================================
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
  console.error('❌ Error:', err.stack);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
});

// ===================================
// EXPORT FOR FIREBASE HOSTING
// ===================================
// For local development, start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║    SERVER STARTED (LOCAL DEVELOPMENT)       ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email configured: ${process.env.SENDGRID_API_KEY ? '✅' : '❌'}`);
    console.log(`🔥 Firebase configured: ${firebaseInitialized ? '✅' : '❌'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`\n📍 Test endpoints:`);
    console.log(`   • Health: http://localhost:${PORT}/`); 
    console.log(`   • Status: http://localhost:${PORT}/api/status`);
    console.log(`   • Email Test: http://localhost:${PORT}/test-email`);
    console.log(`\n💡 REMINDER: All new courses MUST have status: 'active' in Firebase`);
    console.log('');
  });
}

// Export the Express app for Firebase Functions
module.exports = app;