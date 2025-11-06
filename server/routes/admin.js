// server/routes/admin.js - COMPLETE ADMIN MODULE
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(checkRole(['admin']));

// ==================== INSTITUTIONS ====================
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

// Add institution
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

// Update institution
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

// Delete institution
router.delete('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
    await db.collection(collections.INSTITUTIONS).doc(id).delete();

    res.json({ message: 'Institution and related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FACULTIES (ADMIN CAN MANAGE ALL) ====================
// Get all faculties
router.get('/faculties', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.FACULTIES).get();
    const faculties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(faculties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add faculty (to any institution)
router.post('/faculties', async (req, res) => {
  try {
    const { institutionId, name, description } = req.body;

    if (!institutionId || !name) {
      return res.status(400).json({ error: 'Institution ID and name are required' });
    }

    // Verify institution exists
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

// Update faculty
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

// ==================== COURSES (ADMIN CAN MANAGE ALL) ====================
// Get all courses
router.get('/courses', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.COURSES).get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add course (to any institution)
router.post('/courses', async (req, res) => {
  try {
    const { 
      institutionId, 
      facultyId, 
      name, 
      description, 
      duration, 
      level, 
      requirements,
      capacity 
    } = req.body;

    if (!institutionId || !facultyId || !name) {
      return res.status(400).json({ error: 'Institution ID, Faculty ID, and name are required' });
    }

    // Verify faculty exists and belongs to institution
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

// Update course
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

// Delete course
router.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related applications
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

// ==================== COMPANIES ====================
// Get all companies
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

// Approve/Suspend/Activate company
router.put('/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'suspended', 'pending'

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

// Delete company
router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete company's jobs
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

// ==================== USERS ====================
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

// ==================== REPORTS ====================
// Get system reports
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

    const [
      institutions, 
      students, 
      companies, 
      applications, 
      jobs, 
      jobApps,
      faculties,
      courses
    ] = await Promise.all([
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
// Publish admissions (global announcement)
router.post('/admissions/publish', async (req, res) => {
  try {
    const { title, message, deadline, targetInstitutions } = req.body;

    const admissionData = {
      title,
      message,
      deadline,
      targetInstitutions: targetInstitutions || [], // Empty = all institutions
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

module.exports = router;