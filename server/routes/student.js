// server/routes/student.js - FIXED VERSION
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');
const { upload } = require('../utils/fileUpload');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

const router = express.Router();

router.use(verifyToken);
router.use(checkRole(['student']));

// ============================================
// HELPER FUNCTION
// ============================================

async function createNotification(userId, { type, title, message, relatedId }) {
  try {
    const notificationData = {
      userId,
      type,
      title,
      message,
      relatedId: relatedId || null,
      read: false,
      createdAt: new Date().toISOString()
    };
    await db.collection(collections.NOTIFICATIONS).add(notificationData);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Get student profile
router.get('/profile', async (req, res) => {
  try {
    const userDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const userData = userDoc.data();
    delete userData.password;
    
    // Get transcript info if exists
    if (userData.transcriptId) {
      const transcriptDoc = await db.collection(collections.TRANSCRIPTS)
        .doc(userData.transcriptId).get();
      userData.transcript = transcriptDoc.exists ? transcriptDoc.data() : null;
    }
    
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student profile
router.put('/profile', async (req, res) => {
  try {
    const updateData = { 
      ...req.body, 
      updatedAt: new Date().toISOString() 
    };
    
    // Remove protected fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;
    delete updateData.isGraduate;
    delete updateData.transcriptId;

    await db.collection(collections.USERS).doc(req.user.uid).update(updateData);
    
    // Create notification
    await createNotification(req.user.uid, {
      type: 'general',
      title: 'Profile Updated',
      message: 'Your profile has been successfully updated.'
    });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload additional documents
router.post('/documents', async (req, res) => {
  try {
    const { documentType, documentUrl, description } = req.body;

    const documentData = {
      studentId: req.user.uid,
      documentType,
      documentUrl,
      description,
      uploadedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.DOCUMENTS).add(documentData);
    
    res.status(201).json({ 
      id: docRef.id, 
      ...documentData,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INSTITUTIONS & COURSES
// ============================================

// Get all institutions
router.get('/institutions', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.INSTITUTIONS)
      .where('status', '==', 'active')
      .get();
    
    const institutions = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses by institution with detailed info
router.get('/institutions/:institutionId/courses', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    // Verify institution exists
    const instDoc = await db.collection(collections.INSTITUTIONS)
      .doc(institutionId).get();
    
    if (!instDoc.exists) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    
    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', institutionId)
      .where('status', '==', 'active')
      .get();
    
    const courses = await Promise.all(snapshot.docs.map(async doc => {
      const courseData = doc.data();
      
      // Get faculty info
      const facultyDoc = await db.collection(collections.FACULTIES)
        .doc(courseData.facultyId).get();
      
      // Get application count for this course
      const appCount = await db.collection(collections.APPLICATIONS)
        .where('courseId', '==', doc.id)
        .get();
      
      return {
        id: doc.id,
        ...courseData,
        faculty: facultyDoc.exists ? facultyDoc.data() : null,
        applicationCount: appCount.size,
        availableSpots: courseData.capacity ? courseData.capacity - appCount.size : null
      };
    }));

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COURSE APPLICATIONS (Max 2 per institution)
// ============================================

// Apply for course with comprehensive validation
router.post('/applications', async (req, res) => {
  try {
    const { institutionId, courseId, documents } = req.body;

    // 1. CRITICAL: Check if student already SELECTED an institution
    const selectedAdmission = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('selected', '==', true)
      .get();

    if (!selectedAdmission.empty) {
      return res.status(400).json({ 
        error: 'You have already selected an institution and cannot apply to others.' 
      });
    }

    // 2. Check max 2 applications per institution
    const existingApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('institutionId', '==', institutionId)
      .get();

    if (existingApps.size >= 2) {
      return res.status(400).json({ 
        error: 'You can only apply to a maximum of 2 courses per institution' 
      });
    }

    // 3. Check duplicate course application
    const duplicateApp = existingApps.docs.find(doc => 
      doc.data().courseId === courseId
    );
    
    if (duplicateApp) {
      return res.status(400).json({ 
        error: 'You have already applied for this course' 
      });
    }

    // 4. Validate course exists and is active
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseDoc.data();
    if (course.status !== 'active') {
      return res.status(400).json({ error: 'This course is not accepting applications' });
    }

    // 5. Get student info
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();

    // 6. Check course eligibility
    const eligibility = checkCourseEligibility(student, course);
    if (!eligibility.eligible) {
      return res.status(400).json({ 
        error: `You don't meet the requirements: ${eligibility.reason}` 
      });
    }

    // 7. Check course capacity
    if (course.capacity) {
      const currentApps = await db.collection(collections.APPLICATIONS)
        .where('courseId', '==', courseId)
        .where('status', 'in', ['pending', 'admitted'])
        .get();
      
      if (currentApps.size >= course.capacity) {
        return res.status(400).json({ 
          error: 'This course has reached its maximum capacity' 
        });
      }
    }

    // 8. Create application
    const applicationData = {
      studentId: req.user.uid,
      institutionId,
      courseId,
      documents: documents || [],
      status: 'pending',
      selected: false,
      appliedAt: new Date().toISOString(),
      studentInfo: {
        name: student.name,
        email: student.email,
        phone: student.phone,
        qualifications: student.qualifications || []
      }
    };

    const docRef = await db.collection(collections.APPLICATIONS).add(applicationData);
    
    // Create notification
    await createNotification(req.user.uid, {
      type: 'admission',
      title: 'Application Submitted',
      message: `Your application for ${course.name} has been submitted successfully.`,
      relatedId: docRef.id
    });
    
    res.status(201).json({ 
      id: docRef.id, 
      ...applicationData,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Check course eligibility
function checkCourseEligibility(student, course) {
  const studentQualifications = student.qualifications || [];
  const requiredLevel = course.level || 'Certificate';

  // Qualification hierarchy
  const qualificationHierarchy = {
    'High School': 0,
    'Certificate': 1,
    'Diploma': 2,
    'Degree': 3,
    'Masters': 4,
    'PhD': 5
  };

  const studentHighestLevel = Math.max(
    ...studentQualifications.map(q => qualificationHierarchy[q] || 0)
  );

  const requiredLevelValue = qualificationHierarchy[requiredLevel] || 0;

  // Check if student meets minimum requirement
  if (requiredLevel === 'Masters' && studentHighestLevel < qualificationHierarchy['Degree']) {
    return {
      eligible: false,
      reason: 'A Bachelor\'s Degree is required for Masters programs'
    };
  }

  if (requiredLevel === 'PhD' && studentHighestLevel < qualificationHierarchy['Masters']) {
    return {
      eligible: false,
      reason: 'A Master\'s Degree is required for PhD programs'
    };
  }

  if (requiredLevel === 'Degree' && studentHighestLevel < qualificationHierarchy['Diploma']) {
    return {
      eligible: false,
      reason: 'A Diploma or equivalent is required for Degree programs'
    };
  }

  if (requiredLevel === 'Diploma' && studentHighestLevel < qualificationHierarchy['Certificate']) {
    return {
      eligible: false,
      reason: 'A Certificate or equivalent is required for Diploma programs'
    };
  }

  return { eligible: true };
}

// Get my applications
router.get('/applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .get();
    
    // Sort in JavaScript instead of Firestore
    const docs = snapshot.docs.sort((a, b) => {
      const dateA = new Date(a.data().appliedAt);
      const dateB = new Date(b.data().appliedAt);
      return dateB - dateA; // Descending order
    });
    
    const applications = await Promise.all(docs.map(async doc => {
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
    console.error('Get applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INSTITUTION SELECTION (Waitlist Management)
// ============================================

// Select institution - ENHANCED with waitlist promotion
router.post('/applications/:id/select', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the application
    const appDoc = await db.collection(collections.APPLICATIONS).doc(id).get();
    
    if (!appDoc.exists || appDoc.data().studentId !== req.user.uid) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appDoc.data();

    if (application.status !== 'admitted') {
      return res.status(400).json({ 
        error: 'You can only select applications that have been admitted' 
      });
    }

    if (application.selected) {
      return res.status(400).json({ 
        error: 'This application is already selected' 
      });
    }

    // Check if student already selected another institution
    const otherSelected = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('selected', '==', true)
      .get();

    if (!otherSelected.empty) {
      return res.status(400).json({ 
        error: 'You have already selected another institution' 
      });
    }

    // Mark this application as selected
    await db.collection(collections.APPLICATIONS).doc(id).update({
      selected: true,
      selectedAt: new Date().toISOString()
    });

    // Get all OTHER admitted applications for this student
    const otherAdmittedApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('status', '==', 'admitted')
      .get();

    // Reject other applications and promote waitlisted students
    const promises = [];
    
    for (const doc of otherAdmittedApps.docs) {
      if (doc.id !== id) {
        const otherApp = doc.data();
        
        // Reject this application
        promises.push(
          doc.ref.update({ 
            status: 'rejected', 
            reason: 'Student selected another institution',
            rejectedAt: new Date().toISOString()
          })
        );

        // WAITLIST PROMOTION LOGIC
        const waitingList = await db.collection(collections.APPLICATIONS)
          .where('institutionId', '==', otherApp.institutionId)
          .where('courseId', '==', otherApp.courseId)
          .where('status', '==', 'waitlisted')
          .get();

        if (!waitingList.empty) {
          // Sort in JavaScript to get the earliest
          const sortedWaitlist = waitingList.docs.sort((a, b) => {
            const dateA = new Date(a.data().appliedAt);
            const dateB = new Date(b.data().appliedAt);
            return dateA - dateB; // Ascending order
          });

          const nextStudent = sortedWaitlist[0];
          const nextStudentData = nextStudent.data();
          
          // Promote from waitlist
          promises.push(
            nextStudent.ref.update({
              status: 'admitted',
              admittedAt: new Date().toISOString(),
              promotedFromWaitlist: true
            })
          );

          // Notify promoted student
          promises.push(
            createNotification(nextStudentData.studentId, {
              type: 'admission',
              title: 'Congratulations! You\'ve been Admitted',
              message: 'You have been promoted from the waiting list and admitted to your chosen course.',
              relatedId: nextStudent.id
            })
          );
        }
      }
    }

    await Promise.all(promises);

    // Create notification for the student
    await createNotification(req.user.uid, {
      type: 'admission',
      title: 'Institution Selected',
      message: 'You have successfully selected your institution. Your other applications have been rejected.',
      relatedId: id
    });

    res.json({ 
      message: 'Institution selected successfully! Other applications rejected and waiting list students promoted.',
      waitlistPromoted: promises.length > 1
    });
  } catch (error) {
    console.error('Selection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TRANSCRIPT UPLOAD WITH FILE UPLOAD (CLOUDINARY)
// ============================================

// Upload transcript and certificates
router.post('/transcripts', upload.fields([
  { name: 'transcript', maxCount: 1 },
  { name: 'certificates', maxCount: 5 }
]), async (req, res) => {
  try {
    const { graduationYear, gpa, extraCurricularActivities } = req.body;

    // Validate required fields
    if (!req.files?.transcript || !graduationYear) {
      return res.status(400).json({
        error: 'Transcript file and graduation year are required'
      });
    }

    // Validate graduation year
    const year = parseInt(graduationYear);
    if (year < 2000 || year > new Date().getFullYear()) {
      return res.status(400).json({
        error: 'Please enter a valid graduation year'
      });
    }

    // Upload transcript to Cloudinary
    console.log('Uploading transcript to Cloudinary...');
    const transcriptUrl = await uploadToCloudinary(
      req.files.transcript[0],
      req.user.uid,
      'transcripts'
    );
    console.log('Transcript URL:', transcriptUrl);

    // Upload certificates if any
    let certificateUrls = [];
    if (req.files?.certificates) {
      console.log(`Uploading ${req.files.certificates.length} certificates...`);
      certificateUrls = await Promise.all(
        req.files.certificates.map(file =>
          uploadToCloudinary(file, req.user.uid, 'certificates')
        )
      );
    }

    // Prepare transcript data
    const transcriptData = {
      studentId: req.user.uid,
      transcriptUrl,
      certificates: certificateUrls,
      graduationYear: year,
      gpa: gpa ? parseFloat(gpa) : null,
      extraCurricularActivities: extraCurricularActivities
        ? JSON.parse(extraCurricularActivities)
        : [],
      uploadedAt: new Date().toISOString(),
      verified: false
    };

    // Save to Firestore
    const docRef = await db.collection(collections.TRANSCRIPTS).add(transcriptData);

    // Update user profile
    await db.collection(collections.USERS).doc(req.user.uid).update({
      isGraduate: true,
      transcriptId: docRef.id,
      transcriptVerified: false,
      updatedAt: new Date().toISOString()
    });

    // Create notification
    await createNotification(req.user.uid, {
      type: 'transcript_uploaded',
      title: 'Transcript Uploaded Successfully',
      message: 'Your academic transcript has been received. Admins will verify it shortly, and you\'ll be able to apply for jobs once approved!',
      actionUrl: '/student/dashboard'
    });

    res.status(201).json({
      id: docRef.id,
      ...transcriptData,
      message: 'Transcript uploaded successfully! You can now apply for jobs once verified by admins.'
    });
  } catch (error) {
    console.error('Transcript upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload transcript'
    });
  }
});

// Get my transcript
router.get('/transcripts', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.TRANSCRIPTS)
      .where('studentId', '==', req.user.uid)
      .get();
    
    if (snapshot.empty) {
      return res.json(null);
    }

    const transcriptDoc = snapshot.docs[0];
    res.json({
      id: transcriptDoc.id,
      ...transcriptDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// JOB OPPORTUNITIES
// ============================================

// Get available jobs (filtered by qualification)
router.get('/jobs', async (req, res) => {
  try {
    // Get student profile
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();

    // Get all active jobs
    const snapshot = await db.collection(collections.JOBS)
      .where('status', '==', 'active')
      .get();
    
    const jobs = await Promise.all(snapshot.docs.map(async doc => {
      const jobData = doc.data();
      
      // Get company info
      const companyDoc = await db.collection(collections.USERS)
        .doc(jobData.companyId).get();
      
      // Calculate qualification match
      const qualificationMatch = calculateJobMatch(student, jobData);
      
      return {
        id: doc.id,
        ...jobData,
        company: companyDoc.exists ? companyDoc.data().name : 'Unknown Company',
        qualificationMatch,
        qualifiedToApply: qualificationMatch >= 40 // Show jobs with 40%+ match
      };
    }));

    // Filter to show relevant jobs
    const relevantJobs = jobs.filter(job => job.qualifiedToApply);

    res.json(relevantJobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Calculate job match score
function calculateJobMatch(student, job) {
  let score = 0;

  // Has transcript (50 points)
  if (student.transcriptId) {
    score += 50;
  }

  // Qualifications match (30 points)
  if (student.qualifications && job.qualifications) {
    const hasRequiredQual = student.qualifications.some(q => 
      job.qualifications.toLowerCase().includes(q.toLowerCase())
    );
    if (hasRequiredQual) {
      score += 30;
    }
  }

  // Work experience (20 points)
  if (student.workExperience && student.workExperience.length > 0) {
    score += 20;
  }

  return Math.min(score, 100);
}

// Apply for job
router.post('/jobs/:jobId/apply', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    // Validate cover letter
    if (!coverLetter || coverLetter.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Cover letter must be at least 50 characters long' 
      });
    }

    // Check if already applied
    const existingApp = await db.collection(collections.JOB_APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('jobId', '==', jobId)
      .get();

    if (!existingApp.empty) {
      return res.status(400).json({ 
        error: 'You have already applied for this job' 
      });
    }

    // Verify student is graduate with transcript
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const studentData = studentDoc.data();

    if (!studentData.isGraduate || !studentData.transcriptId) {
      return res.status(400).json({ 
        error: 'You must upload your academic transcript before applying for jobs' 
      });
    }

    // Verify job exists
    const jobDoc = await db.collection(collections.JOBS).doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDoc.data();
    if (job.status !== 'active') {
      return res.status(400).json({ error: 'This job is no longer accepting applications' });
    }

    // Create application
    const applicationData = {
      studentId: req.user.uid,
      jobId,
      coverLetter: coverLetter.trim(),
      status: 'pending',
      appliedAt: new Date().toISOString(),
      studentInfo: {
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        transcriptId: studentData.transcriptId
      }
    };

    const docRef = await db.collection(collections.JOB_APPLICATIONS).add(applicationData);
    
    // Create notification
    await createNotification(req.user.uid, {
      type: 'job',
      title: 'Job Application Submitted',
      message: `Your application for ${job.title} has been submitted successfully.`,
      relatedId: docRef.id
    });

    res.status(201).json({ 
      id: docRef.id, 
      ...applicationData,
      message: 'Job application submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my job applications
router.get('/job-applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.JOB_APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .get();
    
    // Sort in JavaScript
    const docs = snapshot.docs.sort((a, b) => {
      const dateA = new Date(a.data().appliedAt);
      const dateB = new Date(b.data().appliedAt);
      return dateB - dateA; // Descending order
    });
    
    const applications = await Promise.all(docs.map(async doc => {
      const appData = doc.data();
      const jobDoc = await db.collection(collections.JOBS).doc(appData.jobId).get();
      
      let jobDetails = null;
      if (jobDoc.exists) {
        const jobData = jobDoc.data();
        const companyDoc = await db.collection(collections.USERS)
          .doc(jobData.companyId).get();
        
        jobDetails = {
          ...jobData,
          company: companyDoc.exists ? companyDoc.data().name : 'Unknown'
        };
      }
      
      return {
        id: doc.id,
        ...appData,
        job: jobDetails
      };
    }));

    res.json(applications);
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

// Get notifications
router.get('/notifications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', req.user.uid)
      .limit(50)
      .get();
    
    // Sort in JavaScript
    const notifications = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA; // Descending order
      });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const notifDoc = await db.collection(collections.NOTIFICATIONS).doc(id).get();
    
    if (!notifDoc.exists || notifDoc.data().userId !== req.user.uid) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db.collection(collections.NOTIFICATIONS).doc(id).update({
      read: true,
      readAt: new Date().toISOString()
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', req.user.uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date().toISOString()
      });
    });

    await batch.commit();

    res.json({ 
      message: 'All notifications marked as read',
      count: snapshot.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;