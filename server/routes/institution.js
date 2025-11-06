// server/routes/institution.js - FIXED WITH WAITING LIST SUPPORT
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

router.use(verifyToken);
router.use(checkRole(['institution']));

// Get institution profile
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

// Update institution profile
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

// Get faculties
router.get('/faculties', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.FACULTIES)
      .where('institutionId', '==', req.user.institutionId || req.user.uid).get();
    const faculties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(faculties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add faculty
router.post('/faculties', async (req, res) => {
  try {
    const { name, description } = req.body;

    const facultyData = {
      name,
      description,
      institutionId: req.user.institutionId || req.user.uid,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.FACULTIES).add(facultyData);
    res.status(201).json({ id: docRef.id, ...facultyData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update faculty
router.put('/faculties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };

    await db.collection(collections.FACULTIES).doc(id).update(updateData);
    res.json({ message: 'Faculty updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete faculty
router.delete('/faculties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related courses
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

// Get courses
router.get('/courses', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', req.user.institutionId || req.user.uid).get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add course
router.post('/courses', async (req, res) => {
  try {
    const { name, facultyId, description, duration, requirements, level, capacity } = req.body;

    const courseData = {
      name,
      facultyId,
      description,
      duration,
      requirements,
      level,
      capacity: capacity || 50, // Default capacity
      enrolledCount: 0,
      institutionId: req.user.institutionId || req.user.uid,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.COURSES).add(courseData);
    res.status(201).json({ id: docRef.id, ...courseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update course
router.put('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };

    await db.collection(collections.COURSES).doc(id).update(updateData);
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete course
router.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(collections.COURSES).doc(id).delete();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student applications
router.get('/applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.APPLICATIONS)
      .where('institutionId', '==', req.user.institutionId || req.user.uid).get();
    
    const applications = await Promise.all(snapshot.docs.map(async doc => {
      const appData = doc.data();
      const [studentDoc, courseDoc] = await Promise.all([
        db.collection(collections.USERS).doc(appData.studentId).get(),
        db.collection(collections.COURSES).doc(appData.courseId).get()
      ]);
      
      const studentData = studentDoc.exists ? studentDoc.data() : null;
      if (studentData) delete studentData.password;
      
      return {
        id: doc.id,
        ...appData,
        student: studentData,
        course: courseDoc.exists ? courseDoc.data() : null
      };
    }));

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application status - FIXED WITH CAPACITY & WAITING LIST
router.put('/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'admitted', 'rejected', 'pending', 'waitlisted'

    if (!['admitted', 'rejected', 'pending', 'waitlisted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appDoc = await db.collection(collections.APPLICATIONS).doc(id).get();
    if (!appDoc.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appDoc.data();

    // PREVENT ADMITTING STUDENT TO MULTIPLE COURSES IN SAME INSTITUTION
    if (status === 'admitted') {
      // Check if student already admitted to another course in this institution
      const existingAdmission = await db.collection(collections.APPLICATIONS)
        .where('studentId', '==', application.studentId)
        .where('institutionId', '==', application.institutionId)
        .where('status', '==', 'admitted')
        .get();

      if (!existingAdmission.empty) {
        return res.status(400).json({
          error: 'This student is already admitted to another program in your institution'
        });
      }

      // Check course capacity
      const courseDoc = await db.collection(collections.COURSES).doc(application.courseId).get();
      const course = courseDoc.data();

      if (course.enrolledCount >= course.capacity) {
        // Auto-waitlist if capacity reached
        await db.collection(collections.APPLICATIONS).doc(id).update({
          status: 'waitlisted',
          waitlistedAt: new Date().toISOString(),
          reason: 'Course capacity reached'
        });

        return res.json({ 
          message: 'Course capacity reached. Student automatically added to waiting list.',
          status: 'waitlisted'
        });
      }

      // Admit student and increment enrolled count
      await Promise.all([
        db.collection(collections.APPLICATIONS).doc(id).update({
          status: 'admitted',
          admittedAt: new Date().toISOString()
        }),
        db.collection(collections.COURSES).doc(application.courseId).update({
          enrolledCount: (course.enrolledCount || 0) + 1
        })
      ]);

      // Send email notification
      const studentDoc = await db.collection(collections.USERS).doc(application.studentId).get();
      // TODO: Send admission email here

      return res.json({ 
        message: 'Student admitted successfully',
        status: 'admitted'
      });
    }

    // Regular status update (rejected, pending, waitlisted)
    await db.collection(collections.APPLICATIONS).doc(id).update({
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'rejected' && { rejectedAt: new Date().toISOString() }),
      ...(status === 'waitlisted' && { waitlistedAt: new Date().toISOString() })
    });

    res.json({ message: `Application ${status} successfully`, status });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk admit students - NEW FEATURE
router.post('/applications/bulk-admit', async (req, res) => {
  try {
    const { applicationIds } = req.body; // Array of application IDs

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid application IDs' });
    }

    const results = {
      admitted: [],
      waitlisted: [],
      failed: []
    };

    for (const appId of applicationIds) {
      try {
        const appDoc = await db.collection(collections.APPLICATIONS).doc(appId).get();
        if (!appDoc.exists) {
          results.failed.push({ id: appId, reason: 'Application not found' });
          continue;
        }

        const application = appDoc.data();

        // Check capacity
        const courseDoc = await db.collection(collections.COURSES).doc(application.courseId).get();
        const course = courseDoc.data();

        if (course.enrolledCount >= course.capacity) {
          // Waitlist
          await appDoc.ref.update({
            status: 'waitlisted',
            waitlistedAt: new Date().toISOString()
          });
          results.waitlisted.push(appId);
        } else {
          // Admit
          await Promise.all([
            appDoc.ref.update({
              status: 'admitted',
              admittedAt: new Date().toISOString()
            }),
            courseDoc.ref.update({
              enrolledCount: (course.enrolledCount || 0) + 1
            })
          ]);
          results.admitted.push(appId);
        }
      } catch (error) {
        results.failed.push({ id: appId, reason: error.message });
      }
    }

    res.json({
      message: 'Bulk admission completed',
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish admissions
router.post('/admissions/publish', async (req, res) => {
  try {
    const { year, semester, deadline } = req.body;

    const admissionData = {
      institutionId: req.user.institutionId || req.user.uid,
      year,
      semester,
      deadline,
      published: true,
      publishedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collections.ADMISSIONS).add(admissionData);
    res.status(201).json({ id: docRef.id, ...admissionData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;