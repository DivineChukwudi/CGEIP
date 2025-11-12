const express = require('express');
const { db, auth, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(checkRole(['admin']));

// ==================== INSTITUTIONS ====================
router.get('/institutions', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.INSTITUTIONS).get();
    const institutions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/institutions', async (req, res) => {
  try {
    const { name, description, location, contact, website } = req.body;
    const institutionData = {
      name,
      description,
      location,
      contact,
      website,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };
    const docRef = await db.collection(collections.INSTITUTIONS).add(institutionData);
    res.status(201).json({ id: docRef.id, ...institutionData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    await db.collection(collections.INSTITUTIONS).doc(id).update(updateData);
    res.json({ message: 'Institution updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
    await db.collection(collections.INSTITUTIONS).doc(id).delete();
    res.json({ message: 'Institution and related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FACULTIES ====================
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
    if (!institutionId || !name) {
      return res.status(400).json({ error: 'Institution ID and name are required' });
    }
    const instDoc = await db.collection(collections.INSTITUTIONS).doc(institutionId).get();
    if (!instDoc.exists) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    const facultyData = {
      institutionId,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };
    const docRef = await db.collection(collections.FACULTIES).add(facultyData);
    res.status(201).json({ id: docRef.id, ...facultyData });
  } catch (error) {
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

// ==================== COURSES ====================
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

// ==================== TRANSCRIPTS ====================
// Get all transcripts for verification
router.get('/transcripts', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.TRANSCRIPTS).get();
    
    const transcripts = await Promise.all(snapshot.docs.map(async doc => {
      const transcriptData = doc.data();
      
      // Get student info
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
    
    // Sort by upload date (newest first)
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

// Verify a transcript
router.post('/transcripts/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transcriptDoc = await db.collection(collections.TRANSCRIPTS).doc(id).get();
    
    if (!transcriptDoc.exists) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    const transcriptData = transcriptDoc.data();
    
    // Update transcript as verified
    await db.collection(collections.TRANSCRIPTS).doc(id).update({
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.user.uid
    });
    
    // Update student's profile
    await db.collection(collections.USERS).doc(transcriptData.studentId).update({
      transcriptVerified: true,
      transcriptVerifiedAt: new Date().toISOString()
    });
    
    console.log(`✅ Transcript ${id} verified for student ${transcriptData.studentId}`);
    
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

// Notify student about transcript verification
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
    
    console.log(`📧 Notification sent to student ${studentId}`);
    
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPANIES ====================
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

// ==================== REPORTS ====================
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

// ==================== ADMISSIONS ====================
router.post('/admissions/publish', async (req, res) => {
  try {
    const { title, message, deadline, targetInstitutions } = req.body;
    const admissionData = {
      title,
      message,
      deadline,
      targetInstitutions: targetInstitutions || [],
      publishedBy: req.user.uid,
      publishedAt: new Date().toISOString(),
      type: 'admission_announcement'
    };
    const docRef = await db.collection(collections.NOTIFICATIONS).add(admissionData);
    res.status(201).json({ 
      id: docRef.id, 
      ...admissionData,
      message: 'Admission announcement published successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================
// Get all users
router.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.USERS).get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      delete data.verificationToken;
      return { id: doc.id, ...data };
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user status
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

// Get single user details
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

// DELETE USER - This must be LAST among user routes
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    console.log(`[DELETE USER] Admin ${req.user.uid} attempting to delete user ${id}, force=${force}`);

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

module.exports = router;