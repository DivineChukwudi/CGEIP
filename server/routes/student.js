// server/routes/student.js - FIXED WITH WAITING LIST & PROPER VALIDATION
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

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

// Apply for course - FIXED WITH PROPER VALIDATION
router.post('/applications', async (req, res) => {
  try {
    const { institutionId, courseId, documents } = req.body;

    // 1. Check if student already admitted to ANY institution
    const admittedApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('status', '==', 'admitted')
      .where('selected', '==', true) // Only check SELECTED admissions
      .get();

    if (!admittedApps.empty) {
      return res.status(400).json({ 
        error: 'You are already admitted and enrolled in an institution.' 
      });
    }

    // 2. Check max 2 applications per institution
    const existingApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('institutionId', '==', institutionId)
      .get();

    if (existingApps.size >= 2) {
      return res.status(400).json({ 
        error: 'Maximum 2 course applications per institution allowed' 
      });
    }

    // 3. Check duplicate course application
    const duplicateApp = existingApps.docs.find(doc => doc.data().courseId === courseId);
    if (duplicateApp) {
      return res.status(400).json({ error: 'You already applied for this course' });
    }

    // 4. VALIDATE COURSE REQUIREMENTS - NEW!
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseDoc.data();
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();

    // Check if student meets requirements
    const meetsRequirements = checkCourseEligibility(student, course);
    if (!meetsRequirements.eligible) {
      return res.status(400).json({ 
        error: `You don't meet the requirements: ${meetsRequirements.reason}` 
      });
    }

    // 5. Create application
    const applicationData = {
      studentId: req.user.uid,
      institutionId,
      courseId,
      documents,
      status: 'pending',
      selected: false,
      appliedAt: new Date().toISOString(),
      studentInfo: {
        name: student.name,
        email: student.email,
        qualifications: student.qualifications || []
      }
    };

    const docRef = await db.collection(collections.APPLICATIONS).add(applicationData);
    res.status(201).json({ 
      id: docRef.id, 
      ...applicationData,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check course eligibility - NEW!
function checkCourseEligibility(student, course) {
  // Example: Check if student has required qualifications
  const studentQualifications = student.qualifications || [];
  const requiredLevel = course.level || 'Diploma';

  // Simple validation - customize based on your requirements
  if (requiredLevel === 'Masters' && !studentQualifications.includes('Degree')) {
    return {
      eligible: false,
      reason: 'A Bachelor\'s Degree is required for Masters programs'
    };
  }

  if (requiredLevel === 'PhD' && !studentQualifications.includes('Masters')) {
    return {
      eligible: false,
      reason: 'A Master\'s Degree is required for PhD programs'
    };
  }

  if (requiredLevel === 'Degree' && !studentQualifications.includes('Diploma')) {
    return {
      eligible: false,
      reason: 'A Diploma or equivalent is required for Degree programs'
    };
  }

  return { eligible: true };
}

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

// Select institution - FIXED WITH WAITING LIST LOGIC
router.post('/applications/:id/select', async (req, res) => {
  try {
    const { id } = req.params;

    const appDoc = await db.collection(collections.APPLICATIONS).doc(id).get();
    if (!appDoc.exists || appDoc.data().studentId !== req.user.uid) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appDoc.data();

    if (application.status !== 'admitted') {
      return res.status(400).json({ error: 'This application is not admitted' });
    }

    // Mark this as selected
    await db.collection(collections.APPLICATIONS).doc(id).update({
      selected: true,
      selectedAt: new Date().toISOString()
    });

    // Get all OTHER admitted applications for this student
    const otherAdmittedApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('status', '==', 'admitted')
      .get();

    // Process each rejected institution
    const promises = [];
    for (const doc of otherAdmittedApps.docs) {
      if (doc.id !== id) { // Skip the selected one
        const otherApp = doc.data();
        
        // Reject this application
        promises.push(
          doc.ref.update({ 
            status: 'rejected', 
            reason: 'Student selected another institution',
            rejectedAt: new Date().toISOString()
          })
        );

        // WAITING LIST LOGIC - Move first waiting list student to admitted
        const waitingList = await db.collection(collections.APPLICATIONS)
          .where('institutionId', '==', otherApp.institutionId)
          .where('courseId', '==', otherApp.courseId)
          .where('status', '==', 'waitlisted')
          .orderBy('appliedAt', 'asc')
          .limit(1)
          .get();

        if (!waitingList.empty) {
          const nextStudent = waitingList.docs[0];
          promises.push(
            nextStudent.ref.update({
              status: 'admitted',
              admittedAt: new Date().toISOString(),
              promotedFromWaitlist: true
            })
          );

          // Send notification to promoted student
          const nextStudentData = nextStudent.data();
          const studentDoc = await db.collection(collections.USERS).doc(nextStudentData.studentId).get();
          
          // TODO: Send email notification here
          console.log(`Promoted student ${studentDoc.data().email} from waiting list`);
        }
      }
    }

    await Promise.all(promises);

    res.json({ 
      message: 'Institution selected successfully. Other applications have been rejected and waiting list students promoted.' 
    });
  } catch (error) {
    console.error('Selection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload transcript (for graduates)
router.post('/transcripts', async (req, res) => {
  try {
    const { transcriptUrl, certificates, graduationYear, gpa, extraCurricularActivities } = req.body;

    const transcriptData = {
      studentId: req.user.uid,
      transcriptUrl,
      certificates: certificates || [],
      graduationYear,
      gpa: gpa || null,
      extraCurricularActivities: extraCurricularActivities || [],
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

// Get available jobs - FILTERED BY QUALIFICATION
router.get('/jobs', async (req, res) => {
  try {
    // Get student's qualifications
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();

    // Get all active jobs
    const snapshot = await db.collection(collections.JOBS)
      .where('status', '==', 'active').get();
    
    const jobs = await Promise.all(snapshot.docs.map(async doc => {
      const jobData = doc.data();
      const companyDoc = await db.collection(collections.USERS).doc(jobData.companyId).get();
      
      // Calculate qualification match
      const qualificationMatch = calculateJobMatch(student, jobData);
      
      return {
        id: doc.id,
        ...jobData,
        company: companyDoc.exists ? companyDoc.data().name : 'Unknown',
        qualificationMatch, // Show match percentage
        qualifiedToApply: qualificationMatch >= 50 // Only show jobs with 50%+ match
      };
    }));

    // Filter to only show qualified jobs
    const qualifiedJobs = jobs.filter(job => job.qualifiedToApply);

    res.json(qualifiedJobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate job match - IMPROVED
function calculateJobMatch(student, job) {
  let score = 0;
  const transcript = student.transcriptId ? 50 : 0; // Has transcript

  // Check qualifications match
  if (student.qualifications && student.qualifications.includes(job.qualifications)) {
    score += 30;
  }

  // Check experience
  if (student.workExperience && student.workExperience.length > 0) {
    score += 20;
  }

  return score + transcript;
}

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
      return res.status(400).json({ error: 'You already applied for this job' });
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