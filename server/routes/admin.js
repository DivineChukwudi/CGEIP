const express = require('express');
const { db, auth, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');
const crypto = require('crypto');

const router = express.Router();

router.use(verifyToken);
router.use(checkRole(['admin']));

// ==================== INSTITUTIONS ====================
// FIXED: Get ALL institutions (from both INSTITUTIONS and USERS collections)
router.get('/institutions', async (req, res) => {
  try {
    console.log('Admin fetching ALL institutions...');
    
    // Get institutions from INSTITUTIONS collection
    const institutionsSnapshot = await db.collection(collections.INSTITUTIONS).get();
    
    // Get institution users from USERS collection
    const institutionUsersSnapshot = await db.collection(collections.USERS)
      .where('role', '==', 'institution')
      .get();
    
    const institutions = [];
    const processedEmails = new Set();
    
    // Process INSTITUTIONS collection (these are admin-created institutions)
    institutionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      institutions.push({
        id: doc.id,
        name: data.name,
        description: data.description || '',
        location: data.location || '',
        contact: data.contact || '',
        website: data.website || '',
        email: data.email || '',
        userId: data.userId || null,
        status: 'active',
        source: 'admin-created',
        createdAt: data.createdAt
      });
      
      if (data.email) {
        processedEmails.add(data.email.toLowerCase());
      }
    });
    
    console.log(`Found ${institutionsSnapshot.size} institutions in INSTITUTIONS collection`);
    
    // Add registered institutions from USERS collection
    // NOTE: These institution users do NOT have a corresponding INSTITUTIONS document yet!
    institutionUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email.toLowerCase();
      
      // Skip if already in institutions (linked)
      if (!processedEmails.has(email)) {
        institutions.push({
          id: doc.id,  // Use the user UID, not institutionId
          name: data.name,
          description: `${data.name} - Higher Learning Institution`,
          location: 'Lesotho',
          contact: data.email,
          website: '',
          email: data.email,
          userId: doc.id,
          status: data.status || 'active',
          source: 'self-registered',
          createdAt: data.createdAt
        });
        
        console.log(`Added self-registered institution: ${data.name} (ID: ${doc.id})`);
      }
    });
    
    // Sort alphabetically
    institutions.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Total ${institutions.length} institutions returned to frontend`);
    console.log('Institution IDs:', institutions.map(i => ({ id: i.id, name: i.name, source: i.source })));
    
    res.json(institutions);
  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// FIXED: Create institution WITH auto user account
router.post('/institutions', async (req, res) => {
  let userCreated = false;
  let firebaseUid = null;
  let institutionId = null;

  try {
    const { name, description, location, contact, website, email, createUserAccount } = req.body;

    if (!name || !location || !contact) {
      return res.status(400).json({ 
        error: 'Name, location, and contact are required' 
      });
    }

    // Create institution document first
    const institutionData = {
      name,
      description: description || '',
      location,
      contact,
      website: website || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const instDocRef = await db.collection(collections.INSTITUTIONS).add(institutionData);
    institutionId = instDocRef.id;
    console.log('Institution document created:', institutionId);

    // FIXED: If email provided and user account requested, create login credentials
    if (email && createUserAccount !== false) {
      console.log('Creating user account for institution:', email);

      // Check if email already exists
      const existingUser = await db.collection(collections.USERS)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        // Email exists - just link to existing user
        const existingUserData = existingUser.docs[0].data();
        const existingUserId = existingUser.docs[0].id;

        await db.collection(collections.USERS).doc(existingUserId).update({
          institutionId: institutionId,
          updatedAt: new Date().toISOString()
        });

        await db.collection(collections.INSTITUTIONS).doc(institutionId).update({
          email: email,
          userId: existingUserId
        });

        console.log('Linked to existing user:', existingUserId);

        return res.status(201).json({ 
          id: institutionId, 
          ...institutionData,
          email,
          userId: existingUserId,
          message: 'Institution created and linked to existing user account'
        });
      }

      // Generate temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      console.log('Generated temp password:', tempPassword);

      try {
        // Create Firebase Auth user
        const userRecord = await auth.createUser({
          email: email,
          password: tempPassword,
          displayName: name,
          emailVerified: true // Admin-created accounts are pre-verified
        });

        firebaseUid = userRecord.uid;
        userCreated = true;
        console.log('Firebase user created:', firebaseUid);

        // Create user document
        const userData = {
          uid: userRecord.uid,
          email: email,
          name: name,
          role: 'institution',
          institutionId: institutionId,
          emailVerified: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: req.user.uid,
          tempPassword: tempPassword, // Store for admin to share
          isAdminCreated: true
        };

        await db.collection(collections.USERS).doc(userRecord.uid).set(userData);
        console.log('User document created');

        // Update institution with user link
        await db.collection(collections.INSTITUTIONS).doc(institutionId).update({
          email: email,
          userId: userRecord.uid
        });

        return res.status(201).json({ 
          id: institutionId, 
          ...institutionData,
          email,
          userId: userRecord.uid,
          tempPassword: tempPassword, // Return so admin can share
          message: 'Institution created with login credentials',
          instructions: `Share these credentials with the institution:\nEmail: ${email}\nTemporary Password: ${tempPassword}\nThey should change this password after first login.`
        });

      } catch (authError) {
        console.error('Firebase Auth error:', authError);
        
        // Rollback institution creation if user creation fails
        await db.collection(collections.INSTITUTIONS).doc(institutionId).delete();
        
        throw new Error('Failed to create user account: ' + authError.message);
      }
    }

    // No email provided - just return institution
    res.status(201).json({ 
      id: institutionId, 
      ...institutionData,
      message: 'Institution created without user account (no email provided)'
    });

  } catch (error) {
    console.error('Create institution error:', error);
    
    // Cleanup on error
    if (userCreated && firebaseUid) {
      try {
        await auth.deleteUser(firebaseUid);
        console.log('Cleaned up Firebase user');
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError.message);
      }
    }

    if (institutionId && !userCreated && email) {
      // Only delete institution if we failed to create user
      try {
        await db.collection(collections.INSTITUTIONS).doc(institutionId).delete();
        console.log('Cleaned up institution document');
      } catch (cleanupError) {
        console.error('Institution cleanup failed:', cleanupError.message);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.put('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Don't allow changing userId or critical fields via regular update
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    await db.collection(collections.INSTITUTIONS).doc(id).update(updateData);
    res.json({ message: 'Institution updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get institution to find linked user
    const instDoc = await db.collection(collections.INSTITUTIONS).doc(id).get();
    const instData = instDoc.data();
    
    // Delete related faculties and courses
    const facultiesSnapshot = await db.collection(collections.FACULTIES)
      .where('institutionId', '==', id).get();
    const deletePromises = [];
    
    facultiesSnapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    
    const coursesSnapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', id).get();
    coursesSnapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    
    await Promise.all(deletePromises);
    
    // Delete institution
    await db.collection(collections.INSTITUTIONS).doc(id).delete();
    
    // FIXED: Optionally delete linked user account (or just unlink it)
    if (instData.userId) {
      console.log('Institution had linked user:', instData.userId);
      // You can choose to delete or just unlink:
      // await db.collection(collections.USERS).doc(instData.userId).delete();
      // OR just unlink:
      await db.collection(collections.USERS).doc(instData.userId).update({
        institutionId: null,
        status: 'inactive'
      });
    }
    
    res.json({ message: 'Institution and related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REST OF ADMIN ROUTES (FACULTIES, COURSES, etc.) ====================
router.get('/faculties', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.FACULTIES).get();
    const faculties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(faculties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/faculties', async (req, res) => {
  try {
    const { institutionId, name, description } = req.body;
    console.log('POST /faculties - Received:', { institutionId, name, description });
    
    if (!institutionId || !name) {
      console.error('Missing required fields - institutionId:', institutionId, 'name:', name);
      return res.status(400).json({ error: 'Institution ID and name are required' });
    }
    
    console.log('Checking if institution exists (checking both INSTITUTIONS and USERS collections)');
    
    // First, try to find in INSTITUTIONS collection
    let instDoc = await db.collection(collections.INSTITUTIONS).doc(institutionId).get();
    
    // If not found, check if it's a user ID (self-registered institution)
    if (!instDoc.exists) {
      console.log('Not found in INSTITUTIONS, checking USERS collection...');
      const userDoc = await db.collection(collections.USERS).doc(institutionId).get();
      
      if (!userDoc.exists || userDoc.data().role !== 'institution') {
        console.error('Neither institution document nor institution user found:', institutionId);
        return res.status(404).json({ error: 'Institution not found' });
      }
      
      console.log('Found institution user:', userDoc.data().name);
    } else {
      console.log('Found institution document:', instDoc.data().name);
    }
    
    const facultyData = {
      institutionId,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };
    
    console.log('Creating faculty:', name);
    const docRef = await db.collection(collections.FACULTIES).add(facultyData);
    console.log('Faculty created:', docRef.id);
    res.status(201).json({ id: docRef.id, ...facultyData });
  } catch (error) {
    console.error('POST /faculties error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put('/faculties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      updatedAt: new Date().toISOString()
    };
    await db.collection(collections.FACULTIES).doc(id).update(updateData);
    res.json({ message: 'Faculty updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/faculties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const coursesSnapshot = await db.collection(collections.COURSES)
      .where('facultyId', '==', id).get();
    const deletePromises = coursesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    await db.collection(collections.FACULTIES).doc(id).delete();
    res.json({ message: 'Faculty and related courses deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.COURSES).get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const { institutionId, facultyId, name, description, duration, level, requirements, capacity } = req.body;
    if (!institutionId || !facultyId || !name) {
      return res.status(400).json({ error: 'Institution ID, Faculty ID, and name are required' });
    }
    const facDoc = await db.collection(collections.FACULTIES).doc(facultyId).get();
    if (!facDoc.exists) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    if (facDoc.data().institutionId !== institutionId) {
      return res.status(400).json({ error: 'Faculty does not belong to selected institution' });
    }
    const courseData = {
      institutionId,
      facultyId,
      name,
      description: description || '',
      duration: duration || '',
      level: level || 'Diploma',
      requirements: requirements || '',
      capacity: capacity || 50,
      enrolledCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };
    const docRef = await db.collection(collections.COURSES).add(courseData);
    res.status(201).json({ id: docRef.id, ...courseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, level, requirements, capacity } = req.body;
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(duration && { duration }),
      ...(level && { level }),
      ...(requirements !== undefined && { requirements }),
      ...(capacity !== undefined && { capacity }),
      updatedAt: new Date().toISOString()
    };
    await db.collection(collections.COURSES).doc(id).update(updateData);
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const appsSnapshot = await db.collection(collections.APPLICATIONS)
      .where('courseId', '==', id).get();
    const deletePromises = appsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    await db.collection(collections.COURSES).doc(id).delete();
    res.json({ message: 'Course and related applications deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transcripts', async (req, res) => {
  try {
    const { studentId } = req.query;
    let query = db.collection(collections.TRANSCRIPTS);
    
    // Filter by studentId if provided (for institution viewing student documents)
    if (studentId) {
      query = query.where('studentId', '==', studentId);
    }
    
    const snapshot = await query.get();
    
    const transcripts = await Promise.all(snapshot.docs.map(async doc => {
      const transcriptData = doc.data();
      
      const studentDoc = await db.collection(collections.USERS)
        .doc(transcriptData.studentId).get();
      
      return {
        id: doc.id,
        ...transcriptData,
        studentInfo: studentDoc.exists ? {
          name: studentDoc.data().name,
          email: studentDoc.data().email
        } : null
      };
    }));
    
    transcripts.sort((a, b) => {
      const dateA = new Date(a.uploadedAt);
      const dateB = new Date(b.uploadedAt);
      return dateB - dateA;
    });
    
    res.json(transcripts);
  } catch (error) {
    console.error('Get transcripts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/transcripts/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transcriptDoc = await db.collection(collections.TRANSCRIPTS).doc(id).get();
    
    if (!transcriptDoc.exists) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    const transcriptData = transcriptDoc.data();
    
    await db.collection(collections.TRANSCRIPTS).doc(id).update({
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.user.uid,
      status: 'verified'
    });
    
    await db.collection(collections.USERS).doc(transcriptData.studentId).update({
      transcriptVerified: true,
      transcriptVerifiedAt: new Date().toISOString()
    });
    
    res.json({ 
      message: 'Transcript verified successfully',
      transcriptId: id,
      studentId: transcriptData.studentId
    });
  } catch (error) {
    console.error('Verify transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/transcripts/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Please provide a detailed reason for declining (at least 10 characters)' 
      });
    }
    
    const transcriptDoc = await db.collection(collections.TRANSCRIPTS).doc(id).get();
    
    if (!transcriptDoc.exists) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    const transcriptData = transcriptDoc.data();
    
    await db.collection(collections.TRANSCRIPTS).doc(id).update({
      verified: false,
      declined: true,
      declinedAt: new Date().toISOString(),
      declinedBy: req.user.uid,
      declineReason: reason,
      status: 'declined'
    });
    
    await db.collection(collections.USERS).doc(transcriptData.studentId).update({
      transcriptVerified: false,
      transcriptDeclined: true
    });
    
    res.json({ 
      message: 'Transcript declined',
      transcriptId: id,
      studentId: transcriptData.studentId
    });
  } catch (error) {
    console.error('Decline transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/notify-student', async (req, res) => {
  try {
    const { studentId, title, message, type } = req.body;
    
    if (!studentId || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const notificationData = {
      userId: studentId,
      type: type || 'general',
      title,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    await db.collection(collections.NOTIFICATIONS).add(notificationData);
    
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/companies', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.USERS)
      .where('role', '==', 'company').get();
    const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db.collection(collections.USERS).doc(id).update({ 
      status,
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedBy: req.user.uid
    });
    res.json({ message: `Company ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jobsSnapshot = await db.collection(collections.JOBS)
      .where('companyId', '==', id).get();
    const deletePromises = jobsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    await db.collection(collections.USERS).doc(id).delete();
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const stats = {
      totalInstitutions: 0,
      totalStudents: 0,
      totalCompanies: 0,
      totalApplications: 0,
      totalJobs: 0,
      totalJobApplications: 0,
      totalFaculties: 0,
      totalCourses: 0
    };
    const [institutions, students, companies, applications, jobs, jobApps, faculties, courses] = await Promise.all([
      db.collection(collections.INSTITUTIONS).get(),
      db.collection(collections.USERS).where('role', '==', 'student').get(),
      db.collection(collections.USERS).where('role', '==', 'company').get(),
      db.collection(collections.APPLICATIONS).get(),
      db.collection(collections.JOBS).get(),
      db.collection(collections.JOB_APPLICATIONS).get(),
      db.collection(collections.FACULTIES).get(),
      db.collection(collections.COURSES).get()
    ]);
    stats.totalInstitutions = institutions.size;
    stats.totalStudents = students.size;
    stats.totalCompanies = companies.size;
    stats.totalApplications = applications.size;
    stats.totalJobs = jobs.size;
    stats.totalJobApplications = jobApps.size;
    stats.totalFaculties = faculties.size;
    stats.totalCourses = courses.size;
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.USERS).get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      delete data.verificationToken;
      delete data.tempPassword;
      return { id: doc.id, ...data };
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (id === req.user.uid) {
      return res.status(400).json({ error: 'You cannot change your own status' });
    }
    await db.collection(collections.USERS).doc(id).update({
      status,
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedBy: req.user.uid
    });
    res.json({ message: `User status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection(collections.USERS).doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();
    delete userData.password;
    delete userData.verificationToken;
    let userStats = {};
    if (userData.role === 'student') {
      const [appsSnapshot, jobAppsSnapshot] = await Promise.all([
        db.collection(collections.APPLICATIONS).where('studentId', '==', id).get(),
        db.collection(collections.JOB_APPLICATIONS).where('studentId', '==', id).get()
      ]);
      userStats = {
        totalApplications: appsSnapshot.size,
        admittedCount: appsSnapshot.docs.filter(doc => doc.data().status === 'admitted').length,
        totalJobApplications: jobAppsSnapshot.size
      };
    } else if (userData.role === 'company') {
      const [jobsSnapshot, appsSnapshot] = await Promise.all([
        db.collection(collections.JOBS).where('companyId', '==', id).get(),
        db.collection(collections.JOB_APPLICATIONS).get()
      ]);
      const jobIds = jobsSnapshot.docs.map(doc => doc.id);
      const companyApplications = appsSnapshot.docs.filter(doc => 
        jobIds.includes(doc.data().jobId)
      );
      userStats = {
        totalJobs: jobsSnapshot.size,
        totalApplicationsReceived: companyApplications.length
      };
    } else if (userData.role === 'institution') {
      const [facultiesSnapshot, coursesSnapshot, appsSnapshot] = await Promise.all([
        db.collection(collections.FACULTIES).where('institutionId', '==', id).get(),
        db.collection(collections.COURSES).where('institutionId', '==', id).get(),
        db.collection(collections.APPLICATIONS).where('institutionId', '==', id).get()
      ]);
      userStats = {
        totalFaculties: facultiesSnapshot.size,
        totalCourses: coursesSnapshot.size,
        totalApplicationsReceived: appsSnapshot.size
      };
    }
    res.json({
      id,
      ...userData,
      stats: userStats
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    if (id === req.user.uid) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const userDoc = await db.collection(collections.USERS).doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const userRole = userData.role;

    let relatedData = {
      applications: 0,
      jobApplications: 0,
      jobs: 0,
      faculties: 0,
      courses: 0,
      notifications: 0,
      transcripts: 0
    };

    if (userRole === 'student') {
      const [apps, jobApps, notifs, transcripts] = await Promise.all([
        db.collection(collections.APPLICATIONS).where('studentId', '==', id).get(),
        db.collection(collections.JOB_APPLICATIONS).where('studentId', '==', id).get(),
        db.collection(collections.NOTIFICATIONS).where('userId', '==', id).get(),
        db.collection(collections.TRANSCRIPTS).where('studentId', '==', id).get()
      ]);
      relatedData.applications = apps.size;
      relatedData.jobApplications = jobApps.size;
      relatedData.notifications = notifs.size;
      relatedData.transcripts = transcripts.size;
    } else if (userRole === 'company') {
      const [jobs, notifs] = await Promise.all([
        db.collection(collections.JOBS).where('companyId', '==', id).get(),
        db.collection(collections.NOTIFICATIONS).where('userId', '==', id).get()
      ]);
      relatedData.jobs = jobs.size;
      relatedData.notifications = notifs.size;
      const jobIds = jobs.docs.map(doc => doc.id);
      if (jobIds.length > 0) {
        let totalJobApps = 0;
        for (let i = 0; i < jobIds.length; i += 10) {
          const batch = jobIds.slice(i, i + 10);
          const appsSnap = await db.collection(collections.JOB_APPLICATIONS)
            .where('jobId', 'in', batch).get();
          totalJobApps += appsSnap.size;
        }
        relatedData.jobApplications = totalJobApps;
      }
    } else if (userRole === 'institution') {
      const [faculties, courses, apps, notifs] = await Promise.all([
        db.collection(collections.FACULTIES).where('institutionId', '==', id).get(),
        db.collection(collections.COURSES).where('institutionId', '==', id).get(),
        db.collection(collections.APPLICATIONS).where('institutionId', '==', id).get(),
        db.collection(collections.NOTIFICATIONS).where('userId', '==', id).get()
      ]);
      relatedData.faculties = faculties.size;
      relatedData.courses = courses.size;
      relatedData.applications = apps.size;
      relatedData.notifications = notifs.size;
    }

    const totalRelatedItems = Object.values(relatedData).reduce((a, b) => a + b, 0);

    if (!force || force !== 'true') {
      return res.json({
        user: {
          id,
          name: userData.name,
          email: userData.email,
          role: userRole
        },
        relatedData,
        totalRelatedItems,
        message: 'Add ?force=true to confirm deletion',
        warning: 'This action cannot be undone!'
      });
    }

    console.log(`[DELETE USER] Starting deletion process...`);
    const deletePromises = [];

    if (userRole === 'student') {
      const appsSnapshot = await db.collection(collections.APPLICATIONS).where('studentId', '==', id).get();
      appsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const jobAppsSnapshot = await db.collection(collections.JOB_APPLICATIONS).where('studentId', '==', id).get();
      jobAppsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const transcriptsSnapshot = await db.collection(collections.TRANSCRIPTS).where('studentId', '==', id).get();
      transcriptsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const notifsSnapshot = await db.collection(collections.NOTIFICATIONS).where('userId', '==', id).get();
      notifsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
    } else if (userRole === 'company') {
      const jobsSnapshot = await db.collection(collections.JOBS).where('companyId', '==', id).get();
      const jobIds = jobsSnapshot.docs.map(doc => doc.id);
      if (jobIds.length > 0) {
        for (let i = 0; i < jobIds.length; i += 10) {
          const batch = jobIds.slice(i, i + 10);
          const jobAppsSnap = await db.collection(collections.JOB_APPLICATIONS).where('jobId', 'in', batch).get();
          jobAppsSnap.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
        }
      }
      jobsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const notifsSnapshot = await db.collection(collections.NOTIFICATIONS).where('userId', '==', id).get();
      notifsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
    } else if (userRole === 'institution') {
      const coursesSnapshot = await db.collection(collections.COURSES).where('institutionId', '==', id).get();
      coursesSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const facultiesSnapshot = await db.collection(collections.FACULTIES).where('institutionId', '==', id).get();
      facultiesSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const appsSnapshot = await db.collection(collections.APPLICATIONS).where('institutionId', '==', id).get();
      appsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      const notifsSnapshot = await db.collection(collections.NOTIFICATIONS).where('userId', '==', id).get();
      notifsSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
      
      // ✅ CRITICAL FIX: Also delete the institution record
      const instSnapshot = await db.collection(collections.INSTITUTIONS).where('email', '==', userData.email).get();
      instSnapshot.docs.forEach(doc => deletePromises.push(doc.ref.delete()));
    }

    console.log(`[DELETE USER] Deleting ${deletePromises.length} related items...`);
    await Promise.all(deletePromises);

    try {
      await auth.deleteUser(id);
      console.log(`[DELETE USER] Deleted from Firebase Auth`);
    } catch (authError) {
      console.warn(`[DELETE USER] Could not delete from Firebase Auth:`, authError.message);
    }

    await db.collection(collections.USERS).doc(id).delete();
    console.log(`[DELETE USER] User document deleted - Complete!`);

    res.json({ 
      message: 'User and all related data deleted successfully',
      deletedUser: {
        id,
        name: userData.name,
        email: userData.email,
        role: userRole
      },
      deletedItems: {
        ...relatedData,
        user: 1
      },
      totalDeleted: deletePromises.length + 1
    });

  } catch (error) {
    console.error('[DELETE USER] Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to delete user. Check server logs for details.'
    });
  }
});

// ==================== ADMISSIONS ====================

// Get all admissions
router.get('/admissions', async (req, res) => {
  try {
    const admissionsSnapshot = await db.collection(collections.ADMISSIONS).get();
    const admissions = admissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate ? data.startDate.toDate().toISOString() : null,
        endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
      };
    });
    res.json(admissions);
  } catch (error) {
    console.error('Get admissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new admission
router.post('/admissions', async (req, res) => {
  try {
    const { title, description, startDate, endDate, status } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Title, start date, and end date are required' });
    }

    const admissionData = {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'open',
      applicationCount: 0,
      createdBy: req.user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection(collections.ADMISSIONS || 'admissions').add(admissionData);
    res.status(201).json({
      id: docRef.id,
      ...admissionData
    });
  } catch (error) {
    console.error('Create admission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update admission
router.put('/admissions/:id', async (req, res) => {
  try {
    const { title, description, startDate, endDate, status } = req.body;
    const updateData = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;

    await db.collection(collections.ADMISSIONS).doc(req.params.id).update(updateData);
    
    const updatedDoc = await db.collection(collections.ADMISSIONS).doc(req.params.id).get();
    const data = updatedDoc.data();
    res.json({
      id: updatedDoc.id,
      ...data,
      startDate: data.startDate ? data.startDate.toDate().toISOString() : null,
      endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('Update admission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete admission
router.delete('/admissions/:id', async (req, res) => {
  try {
    await db.collection(collections.ADMISSIONS).doc(req.params.id).delete();
    res.json({ message: 'Admission deleted successfully' });
  } catch (error) {
    console.error('Delete admission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Publish admission (change status to open)
router.post('/admissions/publish', async (req, res) => {
  try {
    const { admissionId } = req.body;
    
    await db.collection(collections.ADMISSIONS).doc(admissionId).update({
      status: 'open',
      publishedAt: new Date(),
      publishedBy: req.user.uid,
      updatedAt: new Date()
    });

    const updatedDoc = await db.collection(collections.ADMISSIONS).doc(admissionId).get();
    const data = updatedDoc.data();
    res.json({
      message: 'Admission published successfully',
      admission: {
        id: updatedDoc.id,
        ...data,
        startDate: data.startDate ? data.startDate.toDate().toISOString() : null,
        endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error('Publish admission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYSTEM REPORTS ====================

// Get all system reports
router.get('/reports/system', async (req, res) => {
  try {
    const reportsSnapshot = await db.collection(collections.REPORTS).get();
    const reports = reportsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        generatedAt: data.generatedAt ? data.generatedAt.toDate().toISOString() : null
      };
    });
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get report metrics
router.get('/reports/metrics', async (req, res) => {
  try {
    const [admissionsSnapshot, applicationsSnapshot, usersSnapshot, admittedSnapshot] = await Promise.all([
      db.collection(collections.ADMISSIONS || 'admissions').where('status', '==', 'open').get(),
      db.collection(collections.APPLICATIONS || 'applications').get(),
      db.collection(collections.USERS).where('role', '==', 'student').get(),
      db.collection(collections.APPLICATIONS || 'applications').where('status', '==', 'admitted').get()
    ]);

    const metrics = {
      activeAdmissions: admissionsSnapshot.size,
      totalApplications: applicationsSnapshot.size,
      admittedStudents: admittedSnapshot.size,
      pendingReviews: applicationsSnapshot.docs.filter(doc => doc.data().status === 'pending').length,
      totalStudents: usersSnapshot.size
    };

    res.json(metrics);
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate new system report
router.post('/reports/generate', async (req, res) => {
  try {
    const [admissionsSnapshot, applicationsSnapshot, usersSnapshot, admittedSnapshot] = await Promise.all([
      db.collection(collections.ADMISSIONS || 'admissions').get(),
      db.collection(collections.APPLICATIONS || 'applications').get(),
      db.collection(collections.USERS).get(),
      db.collection(collections.APPLICATIONS || 'applications').where('status', '==', 'admitted').get()
    ]);

    const reportData = {
      name: `System Report - ${new Date().toLocaleDateString()}`,
      type: 'system_summary',
      status: 'completed',
      generatedAt: new Date(),
      generatedBy: req.user.uid,
      metrics: {
        totalAdmissions: admissionsSnapshot.size,
        activeAdmissions: admissionsSnapshot.docs.filter(doc => doc.data().status === 'open').length,
        totalApplications: applicationsSnapshot.size,
        admittedStudents: admittedSnapshot.size,
        pendingReviews: applicationsSnapshot.docs.filter(doc => doc.data().status === 'pending').length,
        totalStudents: usersSnapshot.docs.filter(doc => doc.data().role === 'student').length,
        totalInstitutions: usersSnapshot.docs.filter(doc => doc.data().role === 'institution').length,
        totalCompanies: usersSnapshot.docs.filter(doc => doc.data().role === 'company').length
      }
    };

    const docRef = await db.collection(collections.REPORTS || 'system_reports').add(reportData);
    res.status(201).json({
      id: docRef.id,
      ...reportData
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// View specific report
router.get('/reports/:id', async (req, res) => {
  try {
    const reportDoc = await db.collection(collections.REPORTS).doc(req.params.id).get();
    
    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const data = reportDoc.data();
    res.json({
      id: reportDoc.id,
      ...data,
      generatedAt: data.generatedAt ? data.generatedAt.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('View report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download report (returns JSON data that can be exported)
router.get('/reports/:id/download', async (req, res) => {
  try {
    const reportDoc = await db.collection(collections.REPORTS).doc(req.params.id).get();
    
    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportData = reportDoc.data();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.json"`);
    res.json({
      id: reportDoc.id,
      ...reportData,
      generatedAt: reportData.generatedAt ? reportData.generatedAt.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;