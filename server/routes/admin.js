// server/routes/admin.js
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(checkRole(['admin']));

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

// Approve/Suspend/Delete company
router.put('/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'suspended', 'pending'

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.collection(collections.USERS).doc(id).update({ status });
    res.json({ message: `Company ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(collections.USERS).doc(id).delete();
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.USERS).get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      return { id: doc.id, ...data };
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system reports
router.get('/reports', async (req, res) => {
  try {
    const stats = {
      totalInstitutions: 0,
      totalStudents: 0,
      totalCompanies: 0,
      totalApplications: 0,
      totalJobs: 0,
      totalJobApplications: 0
    };

    const [institutions, students, companies, applications, jobs, jobApps] = await Promise.all([
      db.collection(collections.INSTITUTIONS).get(),
      db.collection(collections.USERS).where('role', '==', 'student').get(),
      db.collection(collections.USERS).where('role', '==', 'company').get(),
      db.collection(collections.APPLICATIONS).get(),
      db.collection(collections.JOBS).get(),
      db.collection(collections.JOB_APPLICATIONS).get()
    ]);

    stats.totalInstitutions = institutions.size;
    stats.totalStudents = students.size;
    stats.totalCompanies = companies.size;
    stats.totalApplications = applications.size;
    stats.totalJobs = jobs.size;
    stats.totalJobApplications = jobApps.size;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;