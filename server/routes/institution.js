// server/routes/institution.js
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require institution authentication
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
    const { name, facultyId, description, duration, requirements, level } = req.body;

    const courseData = {
      name,
      facultyId,
      description,
      duration,
      requirements,
      level,
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
      const studentDoc = await db.collection(collections.USERS).doc(appData.studentId).get();
      const studentData = studentDoc.data();
      delete studentData.password;
      
      return {
        id: doc.id,
        ...appData,
        student: studentData
      };
    }));

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application status
router.put('/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'admitted', 'rejected', 'pending'

    if (!['admitted', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.collection(collections.APPLICATIONS).doc(id).update({
      status,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: `Application ${status} successfully` });
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