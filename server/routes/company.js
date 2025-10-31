// server/routes/company.js
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require company authentication
router.use(verifyToken);
router.use(checkRole(['company']));

// Get company profile
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

// Update company profile
router.put('/profile', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;
    delete updateData.status;

    await db.collection(collections.USERS).doc(req.user.uid).update(updateData);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all jobs posted by company
router.get('/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.JOBS)
      .where('companyId', '==', req.user.uid).get();
    
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a job
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
      deadline 
    } = req.body;

    const jobData = {
      companyId: req.user.uid,
      title,
      description,
      requirements,
      qualifications,
      experience,
      location,
      salary,
      deadline,
      status: 'active',
      postedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.JOBS).add(jobData);
    res.status(201).json({ id: docRef.id, ...jobData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update job
router.put('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify job belongs to this company
    const jobDoc = await db.collection(collections.JOBS).doc(id).get();
    if (!jobDoc.exists || jobDoc.data().companyId !== req.user.uid) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    await db.collection(collections.JOBS).doc(id).update(updateData);
    
    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job
router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify job belongs to this company
    const jobDoc = await db.collection(collections.JOBS).doc(id).get();
    if (!jobDoc.exists || jobDoc.data().companyId !== req.user.uid) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await db.collection(collections.JOBS).doc(id).delete();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get qualified applicants for a job
router.get('/jobs/:jobId/applicants', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Verify job belongs to this company
    const jobDoc = await db.collection(collections.JOBS).doc(jobId).get();
    if (!jobDoc.exists || jobDoc.data().companyId !== req.user.uid) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();

    // Get all applications for this job
    const applicationsSnapshot = await db.collection(collections.JOB_APPLICATIONS)
      .where('jobId', '==', jobId).get();
    
    // Get applicant details with transcripts
    const applicants = await Promise.all(applicationsSnapshot.docs.map(async doc => {
      const appData = doc.data();
      
      const [studentDoc, transcriptDoc] = await Promise.all([
        db.collection(collections.USERS).doc(appData.studentId).get(),
        db.collection(collections.TRANSCRIPTS)
          .where('studentId', '==', appData.studentId)
          .limit(1)
          .get()
      ]);

      const studentData = studentDoc.data();
      delete studentData.password;

      const transcript = !transcriptDoc.empty ? transcriptDoc.docs[0].data() : null;

      // Calculate qualification score
      let qualificationScore = 0;
      
      // Score based on requirements match
      if (transcript) {
        // Check academic performance (you can customize this logic)
        qualificationScore += 30;
        
        // Check for extra certificates
        if (transcript.certificates && transcript.certificates.length > 0) {
          qualificationScore += 20;
        }

        // Check experience
        if (studentData.workExperience && studentData.workExperience.length > 0) {
          qualificationScore += 25;
        }

        // Check relevance to job (you can improve this with NLP)
        qualificationScore += 25;
      }

      return {
        id: doc.id,
        ...appData,
        student: studentData,
        transcript,
        qualificationScore
      };
    }));

    // Filter and sort by qualification score
    const qualifiedApplicants = applicants
      .filter(app => app.qualificationScore >= 50) // Minimum 50% match
      .sort((a, b) => b.qualificationScore - a.qualificationScore);

    res.json(qualifiedApplicants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application status
router.put('/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'interview', 'hired', 'rejected'

    if (!['interview', 'hired', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.collection(collections.JOB_APPLICATIONS).doc(id).update({
      status,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: `Application ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;