const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

router.use(verifyToken);
router.use(checkRole(['company']));

// ============================================
// HELPER FUNCTIONS
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

// REQUIREMENT #4: Calculate if student qualifies for job
function calculateJobMatchAndEligibility(student, job) {
  let score = 0;
  let eligible = false;

  // Must be a graduate with transcript
  if (!student.isGraduate || !student.transcriptId) {
    return { score: 0, eligible: false };
  }

  // Has verified transcript (40 points)
  if (student.transcriptId && student.transcriptVerified) {
    score += 40;
    eligible = true;
  } else if (student.transcriptId) {
    score += 20;
  }

  // Qualifications match (40 points)
  if (student.qualifications && job.qualifications) {
    const studentQuals = student.qualifications.map(q => q.toLowerCase());
    const jobQuals = job.qualifications.toLowerCase();
    
    const hasRequiredQual = studentQuals.some(q => jobQuals.includes(q));
    if (hasRequiredQual) {
      score += 40;
      eligible = true;
    } else {
      const partialMatch = studentQuals.some(q => 
        jobQuals.split(' ').some(word => word.includes(q) || q.includes(word))
      );
      if (partialMatch) {
        score += 20;
      }
    }
  }

  // Work experience (20 points)
  if (student.workExperience && student.workExperience.length > 0) {
    score += 20;
  }

  // Eligible if at least 50% match
  eligible = score >= 50;

  return { score: Math.min(score, 100), eligible };
}

// REQUIREMENT #4: Notify qualified students about new job
async function notifyQualifiedStudents(job, jobId) {
  try {
    console.log(`\n🔔 Notifying qualified students about job: ${job.title}`);
    
    // Get all students
    const studentsSnapshot = await db.collection(collections.USERS)
      .where('role', '==', 'student')
      .get();

    let notifiedCount = 0;
    const notificationPromises = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      
      // Calculate qualification match
      const qualificationMatch = calculateJobMatchAndEligibility(student, job);
      
      // Get student job preferences
      const preferencesDoc = await db.collection(collections.JOB_PREFERENCES)
        .doc(studentDoc.id)
        .get();
      
      const preferences = preferencesDoc.exists ? preferencesDoc.data() : null;
      
      // Check if job matches student preferences
      let preferencesMatch = false;
      let matchReason = 'matches your qualifications';
      
      if (preferences) {
        preferencesMatch = checkJobPreferenceMatch(job, preferences);
        if (preferencesMatch) {
          matchReason = 'matches your job interests and qualifications';
        }
      }
      
      // Notify if qualified OR if matches preferences
      if (qualificationMatch.eligible || preferencesMatch) {
        notificationPromises.push(
          createNotification(studentDoc.id, {
            type: 'job',
            title: '🎯 New Job Opportunity for You!',
            message: `${job.title} at ${job.company || 'a company'} - This ${matchReason}. Apply now in the Jobs section!`,
            relatedId: jobId
          })
        );
        notifiedCount++;
      }
    }

    await Promise.all(notificationPromises);
    
    console.log(`✅ Notified ${notifiedCount} students about new job`);
    return notifiedCount;
  } catch (error) {
    console.error('❌ Error notifying students:', error);
    return 0;
  }
}

// Check if job matches student preferences
function checkJobPreferenceMatch(job, preferences) {
  try {
    let matchCount = 0;
    let totalCategories = 0;

    // Check industries match
    if (preferences.industries && preferences.industries.length > 0) {
      totalCategories++;
      if (job.industries && job.industries.length > 0) {
        const industryMatch = job.industries.some(ind => 
          preferences.industries.includes(ind)
        );
        if (industryMatch) matchCount++;
      }
    }

    // Check skills match
    if (preferences.skills && preferences.skills.length > 0) {
      totalCategories++;
      if (job.skills && job.skills.length > 0) {
        const skillMatch = job.skills.some(skill =>
          preferences.skills.some(pSkill => 
            pSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(pSkill.toLowerCase())
          )
        );
        if (skillMatch) matchCount++;
      }
    }

    // Check work type match
    if (preferences.workType && preferences.workType.length > 0) {
      totalCategories++;
      if (job.workType && job.workType.length > 0) {
        const workTypeMatch = job.workType.some(wt =>
          preferences.workType.includes(wt)
        );
        if (workTypeMatch) matchCount++;
      }
    }

    // Check location match
    if (preferences.location) {
      totalCategories++;
      if (job.location && job.location.toLowerCase().includes(preferences.location.toLowerCase())) {
        matchCount++;
      }
    }

    // Match if at least 50% of categories match
    if (totalCategories === 0) return false;
    const matchPercentage = (matchCount / totalCategories) * 100;
    return matchPercentage >= 50;
  } catch (error) {
    console.error('Error checking preference match:', error);
    return false;
  }
}

// ============================================
// COMPANY PROFILE
// ============================================

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

router.put('/profile', async (req, res) => {
  try {
    const updateData = { 
      ...req.body, 
      updatedAt: new Date().toISOString() 
    };
    
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;
    delete updateData.status;

    await db.collection(collections.USERS).doc(req.user.uid).update(updateData);
    
    await createNotification(req.user.uid, {
      type: 'general',
      title: 'Profile Updated',
      message: 'Your company profile has been successfully updated.'
    });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// JOB POSTINGS (REQUIREMENT #4 IMPLEMENTED)
// ============================================

// Get all jobs posted by company
router.get('/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.JOBS)
      .where('companyId', '==', req.user.uid)
      .get();
    
    const jobs = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const dateA = new Date(a.postedAt);
        const dateB = new Date(b.postedAt);
        return dateB - dateA;
      });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new job posting with automatic student notifications
router.post('/jobs', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      requirements, 
      qualifications,
      experience,
      location,
      salary,
      deadline,
      industries,
      skills,
      workType,
      jobTypes // Accept both workType and jobTypes from frontend
    } = req.body;

    // Validation
    if (!title || !description || !qualifications || !location) {
      return res.status(400).json({ 
        error: 'Title, description, qualifications, and location are required' 
      });
    }

    // Get company info
    const companyDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const companyData = companyDoc.data();

    const jobData = {
      companyId: req.user.uid,
      company: companyData.name,
      title: title.trim(),
      description: description.trim(),
      requirements: requirements || '',
      qualifications: qualifications.trim(),
      experience: experience || '',
      location: location.trim(),
      salary: salary || 'Negotiable',
      deadline: deadline || null,
      status: 'active',
      postedAt: new Date().toISOString(),
      applicationsCount: 0,
      // Job matching tags
      industries: industries || [],
      skills: skills || [],
      workType: workType || jobTypes || [] // Support both field names
    };

    const docRef = await db.collection(collections.JOBS).add(jobData);
    
    // Notify company
    await createNotification(req.user.uid, {
      type: 'job',
      title: 'Job Posted Successfully',
      message: `Your job posting "${title}" is now live and visible to qualified students.`,
      relatedId: docRef.id
    });

    // REQUIREMENT #4: Notify all qualified students
    console.log('\n📢 Starting to notify qualified students...');
    const notifiedCount = await notifyQualifiedStudents(jobData, docRef.id);
    
    res.status(201).json({ 
      id: docRef.id, 
      ...jobData,
      message: `Job posted successfully! ${notifiedCount} qualified students have been notified.`,
      notifiedStudents: notifiedCount
    });
  } catch (error) {
    console.error('Job posting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single job details
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const jobDoc = await db.collection(collections.JOBS).doc(id).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();
    
    if (jobData.companyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: jobDoc.id,
      ...jobData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update job posting
router.put('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const jobDoc = await db.collection(collections.JOBS).doc(id).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();
    
    if (jobData.companyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    delete updateData.companyId;
    delete updateData.postedAt;
    delete updateData.applicationsCount;

    await db.collection(collections.JOBS).doc(id).update(updateData);
    
    // If qualifications changed significantly, notify students again
    if (req.body.qualifications && req.body.qualifications !== jobData.qualifications) {
      const updatedJob = { ...jobData, ...updateData };
      await notifyQualifiedStudents(updatedJob, id);
    }
    
    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete/Close job posting
router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const jobDoc = await db.collection(collections.JOBS).doc(id).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();
    
    if (jobData.companyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as inactive instead of deleting
    await db.collection(collections.JOBS).doc(id).update({
      status: 'closed',
      closedAt: new Date().toISOString()
    });
    
    res.json({ message: 'Job posting closed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// JOB APPLICATIONS MANAGEMENT
// ============================================

// Get applications for a specific job
router.get('/jobs/:jobId/applicants', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Verify job belongs to this company
    const jobDoc = await db.collection(collections.JOBS).doc(jobId).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobDoc.data().companyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const jobData = jobDoc.data();

    // Get applications
    const applicationsSnapshot = await db.collection(collections.JOB_APPLICATIONS)
      .where('jobId', '==', jobId)
      .get();
    
    const applicants = await Promise.all(applicationsSnapshot.docs.map(async doc => {
      const appData = doc.data();
      
      // Get student details
      const studentDoc = await db.collection(collections.USERS).doc(appData.studentId).get();
      const studentData = studentDoc.exists ? studentDoc.data() : null;
      
      // Get transcript if exists
      let transcript = null;
      if (studentData?.transcriptId) {
        const transcriptDoc = await db.collection(collections.TRANSCRIPTS)
          .doc(studentData.transcriptId).get();
        transcript = transcriptDoc.exists ? transcriptDoc.data() : null;
      }

      // Calculate qualification score
      let qualificationScore = 0;
      let scores = {
        academic: 0,
        certificates: 0,
        experience: 0,
        relevance: 0
      };

      // Academic Performance (30 points)
      if (transcript?.gpa) {
        const gpa = parseFloat(transcript.gpa);
        if (gpa >= 3.7) scores.academic = 30;
        else if (gpa >= 3.3) scores.academic = 25;
        else if (gpa >= 3.0) scores.academic = 20;
        else if (gpa >= 2.7) scores.academic = 15;
        else if (gpa >= 2.5) scores.academic = 10;
        else scores.academic = 5;
      }

      // Extra Certificates (20 points)
      if (transcript?.certificates && transcript.certificates.length > 0) {
        const certCount = transcript.certificates.length;
        if (certCount >= 5) scores.certificates = 20;
        else if (certCount >= 3) scores.certificates = 15;
        else if (certCount >= 2) scores.certificates = 10;
        else scores.certificates = 5;
      }

      // Work Experience (25 points)
      if (studentData?.workExperience && studentData.workExperience.length > 0) {
        scores.experience = Math.min(25, studentData.workExperience.length * 10);
      }

      // Relevance (25 points)
      if (studentData?.qualifications && jobData.qualifications) {
        const studentQuals = studentData.qualifications.map(q => q.toLowerCase());
        const jobQuals = jobData.qualifications.toLowerCase();
        const hasMatch = studentQuals.some(q => jobQuals.includes(q));
        scores.relevance = hasMatch ? 25 : 10;
      }

      qualificationScore = scores.academic + scores.certificates + scores.experience + scores.relevance;
      
      return {
        id: doc.id,
        ...appData,
        student: studentData ? {
          name: studentData.name,
          email: studentData.email,
          phone: studentData.phone,
          qualifications: studentData.qualifications,
          workExperience: studentData.workExperience
        } : null,
        transcript,
        qualificationScore,
        scoreBreakdown: scores
      };
    }));

    // Sort by qualification score
    applicants.sort((a, b) => b.qualificationScore - a.qualificationScore);

    res.json(applicants);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all applications across all jobs
router.get('/applications', async (req, res) => {
  try {
    // Get all jobs by this company
    const jobsSnapshot = await db.collection(collections.JOBS)
      .where('companyId', '==', req.user.uid)
      .get();
    
    const jobIds = jobsSnapshot.docs.map(doc => doc.id);

    if (jobIds.length === 0) {
      return res.json([]);
    }

    const applications = [];
    
    // Get applications in batches of 10 (Firestore 'in' limit)
    for (let i = 0; i < jobIds.length; i += 10) {
      const batch = jobIds.slice(i, i + 10);
      const snapshot = await db.collection(collections.JOB_APPLICATIONS)
        .where('jobId', 'in', batch)
        .get();
      
      for (const doc of snapshot.docs) {
        const appData = doc.data();
        
        const [studentDoc, jobDoc] = await Promise.all([
          db.collection(collections.USERS).doc(appData.studentId).get(),
          db.collection(collections.JOBS).doc(appData.jobId).get()
        ]);
        
        applications.push({
          id: doc.id,
          ...appData,
          student: studentDoc.exists ? {
            name: studentDoc.data().name,
            email: studentDoc.data().email,
            phone: studentDoc.data().phone
          } : null,
          job: jobDoc.exists ? {
            title: jobDoc.data().title,
            location: jobDoc.data().location
          } : null
        });
      }
    }

    // Sort by date
    applications.sort((a, b) => {
      const dateA = new Date(a.appliedAt);
      const dateB = new Date(b.appliedAt);
      return dateB - dateA;
    });

    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update application status
router.put('/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!['reviewing', 'shortlisted', 'interviewed', 'hired', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: reviewing, shortlisted, interviewed, hired, or rejected' 
      });
    }

    const appDoc = await db.collection(collections.JOB_APPLICATIONS).doc(id).get();
    
    if (!appDoc.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appData = appDoc.data();
    
    // Verify job belongs to this company
    const jobDoc = await db.collection(collections.JOBS).doc(appData.jobId).get();
    if (!jobDoc.exists || jobDoc.data().companyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update application
    await db.collection(collections.JOB_APPLICATIONS).doc(id).update({
      status,
      feedback: feedback || null,
      statusUpdatedAt: new Date().toISOString()
    });

    // Notify student
    const statusMessages = {
      reviewing: 'Your application is now under review',
      shortlisted: 'Congratulations! You have been shortlisted',
      interviewed: 'You have been selected for an interview',
      hired: 'Congratulations! You have been hired',
      rejected: 'Unfortunately, your application was not successful this time'
    };

    await createNotification(appData.studentId, {
      type: 'job',
      title: `Application Status Update: ${jobDoc.data().title}`,
      message: statusMessages[status],
      relatedId: id
    });

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

router.get('/notifications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', req.user.uid)
      .limit(50)
      .get();
    
    const notifications = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

module.exports = router;