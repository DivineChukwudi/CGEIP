const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, auth, collections } = require('../config/firebase');
const { sendVerificationEmail } = require('../utils/email');

const router = express.Router();

// ==================== REGISTER WITH INSTITUTION/COMPANY SYNC ====================
router.post('/register', async (req, res) => {
  let userCreated = false;
  let firebaseUid = null;
  let institutionId = null;

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

    // ✅ If registering as INSTITUTION, create INSTITUTION document too
    if (role === 'institution') {
      console.log('🏛️ Creating institution record for:', name);
      
      const institutionData = {
        name: name,
        email: email,
        description: additionalData.description || `${name} - Higher Learning Institution`,
        location: additionalData.location || 'Lesotho',
        contact: additionalData.contact || email,
        website: additionalData.website || '',
        status: 'active',
        userId: userRecord.uid, // Link to user account
        createdAt: new Date().toISOString(),
        createdBy: 'self-registration'
      };

      // Create institution document
      const instRef = await db.collection(collections.INSTITUTIONS).add(institutionData);
      institutionId = instRef.id;
      console.log('✅ Institution document created:', institutionId);
      
      // Link user to institution
      userData.institutionId = institutionId;
    }

    // ✅ If registering as COMPANY, set pending status
    if (role === 'company') {
      console.log('🏢 Company registration for:', name);
      userData.status = 'pending'; // Companies need admin approval
    }

    // Save to Firestore
    await db.collection(collections.USERS).doc(userRecord.uid).set(userData);

    // Send response IMMEDIATELY
    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      uid: userRecord.uid,
      role: role,
      ...(institutionId && { institutionId })
    });

    // Send verification email ASYNCHRONOUSLY
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}&uid=${userRecord.uid}`;
    
    console.log('🔗 Verification Link:', verificationLink);
    console.log('📧 Sending to:', email);
    console.log('🌍 Frontend URL:', frontendUrl);
    
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
      });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Clean up Firebase Auth user and institution if Firestore fails
    if (userCreated && firebaseUid) {
      try {
        await auth.deleteUser(firebaseUid);
        console.log('🧹 Cleaned up Firebase Auth user after error');
        
        // Also cleanup institution if it was created
        if (institutionId) {
          await db.collection(collections.INSTITUTIONS).doc(institutionId).delete();
          console.log('🧹 Cleaned up institution document after error');
        }
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

// ==================== LOGIN WITH STRICT EMAIL VERIFICATION ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // ✅ CRITICAL: Verify password using Firebase Auth
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      console.log(`✅ Firebase auth successful for: ${email}`);
    } catch (firebaseError) {
      console.error(`❌ Firebase auth failed: ${firebaseError.message}`);
      
      // Map Firebase error messages to user-friendly ones
      if (firebaseError.code === 'auth/invalid-credential' || 
          firebaseError.code === 'auth/wrong-password' ||
          firebaseError.code === 'auth/user-not-found') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      if (firebaseError.code === 'auth/too-many-requests') {
        return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      }
      
      throw firebaseError;
    }

    // Get user from Firestore
    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // ✅ CRITICAL: Block login if email is not verified
    if (!userData.emailVerified) {
      console.log(`❌ Login blocked: ${email} - Email not verified`);
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in.',
        emailVerified: false,
        message: 'Check your inbox for the verification email. If you haven\'t received it, you can request a new one.',
        email: email,
        uid: userData.uid
      });
    }

    // Check account status
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

    // Update last login
    await db.collection(collections.USERS).doc(userData.uid).update({
      lastLogin: new Date().toISOString()
    });

    delete userData.verificationToken;

    console.log(`✅ Login successful: ${email} (${userData.role})`);

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== VERIFY EMAIL ====================
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

    console.log(`✅ Email verified: ${userData.email}`);

    res.json({ 
      message: 'Email verified successfully! You can now login.',
      success: true 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESEND VERIFICATION EMAIL ====================
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
    
    console.log('🔁 Resending verification email');
    console.log('🔗 Verification Link:', verificationLink);
    console.log('📧 Sending to:', email);
    console.log('🌍 Frontend URL:', frontendUrl);
    
    try {
      await sendVerificationEmail(email, userData.name, verificationLink);
      console.log('✅ Verification email resent to:', email);
      res.json({ 
        message: 'Verification email sent! Please check your inbox.',
        success: true 
      });
    } catch (emailError) {
      console.error('❌ Resend email error:', emailError);
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

// ==================== GOOGLE SIGN-IN WITH INSTITUTION SYNC ====================
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
        emailVerified: email_verified || true, // Google emails are pre-verified
        role,
        status: role === 'company' ? 'pending' : 'active',
        authProvider: 'google',
        createdAt: new Date().toISOString()
      };

      // ✅ If Google user registers as institution, create institution record
      if (role === 'institution') {
        console.log('🏛️ Creating institution for Google user:', name);
        
        const institutionData = {
          name: userData.name,
          email: email,
          description: `${userData.name} - Higher Learning Institution`,
          location: 'Lesotho',
          contact: email,
          website: '',
          status: 'active',
          userId: uid,
          createdAt: new Date().toISOString(),
          createdBy: 'google-registration'
        };

        const instRef = await db.collection(collections.INSTITUTIONS).add(institutionData);
        userData.institutionId = instRef.id;
        console.log('✅ Institution created for Google user:', instRef.id);
      }

      await db.collection(collections.USERS).doc(uid).set(userData);
      console.log('✅ New Google user created:', email);
    } else {
      userData = userDoc.data();
      await db.collection(collections.USERS).doc(uid).update({
        lastLogin: new Date().toISOString()
      });
      console.log('✅ Existing Google user logged in:', email);
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

// ==================== GOOGLE COMPLETE REGISTRATION WITH INSTITUTION SYNC ====================
router.post('/google-complete-registration', async (req, res) => {
  try {
    const { idToken, role, password, name } = req.body;

    if (!idToken || !role || !password) {
      return res.status(400).json({ 
        error: 'Google token, role, and password are required' 
      });
    }

    if (!['student', 'institution', 'company'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify Google ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, picture, email_verified } = decodedToken;

    // Check if user already exists
    let userDoc = await db.collection(collections.USERS).doc(uid).get();

    if (userDoc.exists) {
      return res.status(400).json({ 
        error: 'This Google account is already registered. Please login instead.' 
      });
    }

    // Create new user with Google auth + password
    const userData = {
      uid,
      email,
      name: name || decodedToken.name || email.split('@')[0],
      photoURL: picture || '',
      emailVerified: email_verified || true, // Google emails are pre-verified
      role,
      status: role === 'company' ? 'pending' : 'active',
      authProvider: 'google',
      hasPassword: true, // User set a password
      createdAt: new Date().toISOString()
    };

    // ✅ Create institution record if role is institution
    if (role === 'institution') {
      console.log('🏛️ Creating institution for Google complete registration:', name);
      
      const institutionData = {
        name: userData.name,
        email: email,
        description: `${userData.name} - Higher Learning Institution`,
        location: 'Lesotho',
        contact: email,
        website: '',
        status: 'active',
        userId: uid,
        createdAt: new Date().toISOString(),
        createdBy: 'google-registration'
      };

      const instRef = await db.collection(collections.INSTITUTIONS).add(institutionData);
      userData.institutionId = instRef.id;
      console.log('✅ Institution created:', instRef.id);
    }

    // Store user in Firestore
    await db.collection(collections.USERS).doc(uid).set(userData);
    
    // Also update Firebase Auth with the password
    try {
      await auth.updateUser(uid, {
        password: password,
        displayName: userData.name
      });
      console.log('✅ Password set for Google user:', email);
    } catch (updateError) {
      console.warn('⚠️ Could not set password for existing Firebase user:', updateError.message);
    }

    console.log('✅ Google user registered with password:', email);

    // Generate JWT token
    const token = jwt.sign(
      { uid: userData.uid, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete userData.password;

    res.json({
      message: 'Account created successfully',
      token,
      user: userData,
      isNewUser: true
    });

  } catch (error) {
    console.error('Google complete registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// ==================== CHECK IF USER EXISTS ====================
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check in Firestore
    const usersSnapshot = await db.collection(collections.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    res.json({ 
      exists: !usersSnapshot.empty,
      email: email
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;