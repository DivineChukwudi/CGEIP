// server/routes/auth.js - PRODUCTION-READY VERSION
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, auth, collections } = require('../config/firebase');
const { sendVerificationEmail } = require('../utils/email');

const router = express.Router();

// Register - Production-Ready with Better Error Handling
router.post('/register', async (req, res) => {
  let userCreated = false;
  let firebaseUid = null;

  try {
    const { email, password, role, name, ...additionalData } = req.body;

    // Validate required fields
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role
    const validRoles = ['admin', 'institution', 'student', 'company'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists in Firestore
    const existingUser = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    firebaseUid = userRecord.uid;
    userCreated = true;

    // Create user document
    const userData = {
      uid: userRecord.uid,
      email,
      role,
      name,
      emailVerified: false,
      verificationToken,
      verificationExpires: verificationExpires.toISOString(),
      status: role === 'company' ? 'pending' : 'active',
      createdAt: new Date().toISOString(),
      ...additionalData
    };

    // Save to Firestore
    await db.collection(collections.USERS).doc(userRecord.uid).set(userData);

    // Send response IMMEDIATELY - don't wait for email
    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      uid: userRecord.uid
    });

    // Send verification email ASYNCHRONOUSLY
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}&uid=${userRecord.uid}`;
    
    // Send email without blocking response
    sendVerificationEmail(email, name, verificationLink)
      .then(() => {
        console.log('✅ Verification email sent to:', email);
      })
      .catch((emailError) => {
        console.error('❌ Email sending failed:', emailError.message);
        console.error('   User was created but email was not sent');
        console.error('   Email:', email);
        console.error('   UID:', userRecord.uid);
        console.error('   Verification Link:', verificationLink);
        
        // Log to a monitoring service in production
        // You could send this to Sentry, LogRocket, etc.
        
        // Optionally: Store failed email in database for retry later
        db.collection('failed_emails').add({
          email,
          name,
          verificationLink,
          error: emailError.message,
          timestamp: new Date().toISOString(),
          retryCount: 0
        }).catch(err => console.error('Failed to log email error:', err));
      });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Clean up Firebase Auth user if Firestore fails
    if (userCreated && firebaseUid) {
      try {
        await auth.deleteUser(firebaseUid);
        console.log('🧹 Cleaned up Firebase Auth user after error');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError.message);
      }
    }
    
    // Handle specific Firebase errors
    let errorMessage = error.message;
    
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'User already exists';
      return res.status(400).json({ error: errorMessage });
    }
    
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
      return res.status(400).json({ error: errorMessage });
    }
    
    if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
      return res.status(400).json({ error: errorMessage });
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { uid } = req.query;

    if (!token || !uid) {
      return res.status(400).json({ error: 'Invalid verification link' });
    }

    const userDoc = await db.collection(collections.USERS).doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (userData.emailVerified) {
      return res.json({ 
        message: 'Email already verified. You can login now.',
        success: true,
        alreadyVerified: true
      });
    }

    if (userData.verificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const expirationDate = new Date(userData.verificationExpires);
    if (expirationDate < new Date()) {
      return res.status(400).json({ 
        error: 'Verification link has expired. Please request a new one.',
        expired: true
      });
    }

    // Verify email in Firebase Auth
    await auth.updateUser(uid, { emailVerified: true });

    // Update Firestore
    await db.collection(collections.USERS).doc(uid).update({
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
      verifiedAt: new Date().toISOString()
    });

    res.json({ 
      message: 'Email verified successfully! You can now login.',
      success: true 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.collection(collections.USERS).doc(userData.uid).update({
      verificationToken,
      verificationExpires: verificationExpires.toISOString()
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}&uid=${userData.uid}`;
    
    // Send email and handle errors
    try {
      await sendVerificationEmail(email, userData.name, verificationLink);
      res.json({ 
        message: 'Verification email sent! Please check your inbox.',
        success: true 
      });
    } catch (emailError) {
      console.error('Resend email error:', emailError);
      res.status(500).json({ 
        error: 'Failed to send email. Please try again later or contact support.',
        verificationLink // In dev, you can manually use this link
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login - Simplified
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Your account has been suspended. Please contact support.' 
      });
    }

    if (userData.status === 'pending') {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval.' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const emailWarning = !userData.emailVerified 
      ? 'Please verify your email address.' 
      : null;

    delete userData.verificationToken;

    res.json({
      message: 'Login successful',
      token,
      user: userData,
      ...(emailWarning && { warning: emailWarning })
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Sign-In (keeping existing code)
router.post('/google-signin', async (req, res) => {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    let userDoc = await db.collection(collections.USERS).doc(uid).get();
    let userData;

    if (!userDoc.exists) {
      if (!role || !['student', 'institution', 'company'].includes(role)) {
        return res.status(400).json({ 
          error: 'Please select your account type',
          requiresRole: true
        });
      }

      userData = {
        uid,
        email,
        name: name || email.split('@')[0],
        photoURL: picture || '',
        emailVerified: email_verified || true,
        role,
        status: role === 'company' ? 'pending' : 'active',
        authProvider: 'google',
        createdAt: new Date().toISOString()
      };

      await db.collection(collections.USERS).doc(uid).set(userData);
    } else {
      userData = userDoc.data();
      await db.collection(collections.USERS).doc(uid).update({
        lastLogin: new Date().toISOString()
      });
    }

    if (userData.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    if (userData.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval.' });
    }

    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete userData.verificationToken;

    res.json({
      message: userDoc.exists ? 'Login successful' : 'Account created successfully',
      token,
      user: userData,
      isNewUser: !userDoc.exists
    });

  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: 'Google sign-in failed: ' + error.message });
  }
});

module.exports = router;