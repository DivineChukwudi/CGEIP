// server/routes/student.js
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require student authentication
router.use(verifyToken);
router.use(checkRole(['student']));

// Get student profile
router.get('/profile', async (req, res) => {
  try {
    const userDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const userData = userDoc.data();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student profile
router.put('/profile', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;

    await db.collection(collections.USERS).doc(req.user.uid).update(updateData);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all institutions
router.get('/institutions', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.INSTITUTIONS).get();
    const institutions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses by institution
router.get('/institutions/:institutionId/courses', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', institutionId).get();
    
    const courses = await Promise.all(snapshot.docs.map(async doc => {
      const courseData = doc.data();
      const facultyDoc = await db.collection(collections.FACULTIES).doc(courseData.facultyId).get();
      
      return {
        id: doc.id,
        ...courseData,
        faculty: facultyDoc.exists ? facultyDoc.data() : null
      };
    }));

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply for course
router.post('/applications', async (req, res) => {
  try {
    const { institutionId, courseId, documents } = req.body;

    // Check if student already applied for 2 courses at this institution
    const existingApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('institutionId', '==', institutionId)
      .get();

    if (existingApps.size >= 2) {
      return res.status(400).json({ 
        error: 'You can only apply for a maximum of 2 courses per institution' 
      });
    }

    // Check if already applied for this specific course
    const duplicateApp = existingApps.docs.find(doc => doc.data().courseId === courseId);
    if (duplicateApp) {
      return res.status(400).json({ error: 'You have already applied for this course' });
    }

    // Check if student is already admitted to another institution
    const admittedApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('status', '==', 'admitted')
      .get();

    if (!admittedApps.empty) {
      return res.status(400).json({ 
        error: 'You are already admitted to an institution. Please select your choice first.' 
      });
    }

    const applicationData = {
      studentId: req.user.uid,
      institutionId,
      courseId,
      documents,
      status: 'pending',
      appliedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.APPLICATIONS).add(applicationData);
    res.status(201).json({ id: docRef.id, ...applicationData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my applications
router.get('/applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid).get();
    
    const applications = await Promise.all(snapshot.docs.map(async doc => {
      const appData = doc.data();
      const [institutionDoc, courseDoc] = await Promise.all([
        db.collection(collections.INSTITUTIONS).doc(appData.institutionId).get(),
        db.collection(collections.COURSES).doc(appData.courseId).get()
      ]);
      
      return {
        id: doc.id,
        ...appData,
        institution: institutionDoc.exists ? institutionDoc.data() : null,
        course: courseDoc.exists ? courseDoc.data() : null
      };
    }));

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Select admitted institution (when admitted to multiple)
router.post('/applications/:id/select', async (req, res) => {
  try {
    const { id } = req.params;

    const appDoc = await db.collection(collections.APPLICATIONS).doc(id).get();
    if (!appDoc.exists || appDoc.data().studentId !== req.user.uid) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (appDoc.data().status !== 'admitted') {
      return res.status(400).json({ error: 'This application is not admitted' });
    }

    // Mark this as selected
    await db.collection(collections.APPLICATIONS).doc(id).update({
      selected: true,
      selectedAt: new Date().toISOString()
    });

    // Reject all other admitted applications
    const otherApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('status', '==', 'admitted')
      .get();

    const updatePromises = otherApps.docs
      .filter(doc => doc.id !== id)
      .map(doc => doc.ref.update({ status: 'rejected', reason: 'Student selected another institution' }));

    await Promise.all(updatePromises);

    res.json({ message: 'Institution selected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload transcript (for graduates)
router.post('/transcripts', async (req, res) => {
  try {
    const { transcriptUrl, certificates, graduationYear } = req.body;

    const transcriptData = {
      studentId: req.user.uid,
      transcriptUrl,
      certificates,
      graduationYear,
      uploadedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.TRANSCRIPTS).add(transcriptData);
    
    // Update user profile to indicate graduation
    await db.collection(collections.USERS).doc(req.user.uid).update({
      isGraduate: true,
      transcriptId: docRef.id
    });

    res.status(201).json({ id: docRef.id, ...transcriptData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available jobs
router.get('/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.JOBS)
      .where('status', '==', 'active').get();
    
    const jobs = await Promise.all(snapshot.docs.map(async doc => {
      const jobData = doc.data();
      const companyDoc = await db.collection(collections.USERS).doc(jobData.companyId).get();
      
      return {
        id: doc.id,
        ...jobData,
        company: companyDoc.exists ? companyDoc.data().name : 'Unknown'
      };
    }));

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply for job
router.post('/jobs/:jobId/apply', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    // Check if already applied
    const existingApp = await db.collection(collections.JOB_APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('jobId', '==', jobId)
      .get();

    if (!existingApp.empty) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    // Check if student is a graduate with transcript
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const studentData = studentDoc.data();

    if (!studentData.isGraduate || !studentData.transcriptId) {
      return res.status(400).json({ 
        error: 'You must upload your transcript before applying for jobs' 
      });
    }

    const applicationData = {
      studentId: req.user.uid,
      jobId,
      coverLetter,
      status: 'pending',
      appliedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.JOB_APPLICATIONS).add(applicationData);
    res.status(201).json({ id: docRef.id, ...applicationData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my job applications
router.get('/job-applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.JOB_APPLICATIONS)
      .where('studentId', '==', req.user.uid).get();
    
    const applications = await Promise.all(snapshot.docs.map(async doc => {
      const appData = doc.data();
      const jobDoc = await db.collection(collections.JOBS).doc(appData.jobId).get();
      
      return {
        id: doc.id,
        ...appData,
        job: jobDoc.exists ? jobDoc.data() : null
      };
    }));

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;