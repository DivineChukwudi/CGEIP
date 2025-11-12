const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

router.use(verifyToken);
router.use(checkRole(['institution']));

// ==================== STATISTICS - NEW! ====================
router.get('/statistics', async (req, res) => {
  try {
    const institutionId = req.user.institutionId || req.user.uid;

    // Get all data in parallel
    const [
      facultiesSnapshot,
      coursesSnapshot,
      applicationsSnapshot
    ] = await Promise.all([
      db.collection(collections.FACULTIES)
        .where('institutionId', '==', institutionId)
        .get(),
      db.collection(collections.COURSES)
        .where('institutionId', '==', institutionId)
        .get(),
      db.collection(collections.APPLICATIONS)
        .where('institutionId', '==', institutionId)
        .get()
    ]);

    // Count applications by status
    let totalApplications = 0;
    let pendingApplications = 0;
    let admittedStudents = 0;
    let rejectedApplications = 0;
    let totalEnrolled = 0;
    let totalCapacity = 0;

    applicationsSnapshot.forEach(doc => {
      const app = doc.data();
      totalApplications++;
      
      if (app.status === 'pending') pendingApplications++;
      if (app.status === 'admitted') admittedStudents++;
      if (app.status === 'rejected') rejectedApplications++;
    });

    // Count course capacity
    coursesSnapshot.forEach(doc => {
      const course = doc.data();
      totalCapacity += course.capacity || 50;
      totalEnrolled += course.enrolledCount || 0;
    });

    const statistics = {
      totalFaculties: facultiesSnapshot.size,
      totalCourses: coursesSnapshot.size,
      totalApplications,
      pendingApplications,
      admittedStudents,
      rejectedApplications,
      totalEnrolled,
      totalCapacity,
      enrollmentPercentage: totalCapacity > 0 
        ? Math.round((totalEnrolled / totalCapacity) * 100) 
        : 0
    };

    res.json(statistics);
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// ==================== FACULTIES ====================
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

    if (!name) {
      return res.status(400).json({ error: 'Faculty name is required' });
    }

    const facultyData = {
      name,
      description: description || '',
      institutionId: req.user.institutionId || req.user.uid,
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

    // Verify faculty belongs to this institution
    const facultyDoc = await db.collection(collections.FACULTIES).doc(id).get();
    if (!facultyDoc.exists || facultyDoc.data().institutionId !== (req.user.institutionId || req.user.uid)) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
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
    
    // Verify faculty belongs to this institution
    const facultyDoc = await db.collection(collections.FACULTIES).doc(id).get();
    if (!facultyDoc.exists || facultyDoc.data().institutionId !== (req.user.institutionId || req.user.uid)) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    
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

// ==================== COURSES ====================
// Get courses
router.get('/courses', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', req.user.institutionId || req.user.uid).get();
    
    // Include faculty information
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

// Add course
router.post('/courses', async (req, res) => {
  try {
    const { name, facultyId, description, duration, requirements, level, capacity } = req.body;

    if (!name || !facultyId) {
      return res.status(400).json({ error: 'Course name and faculty are required' });
    }

    // Verify faculty belongs to this institution
    const facultyDoc = await db.collection(collections.FACULTIES).doc(facultyId).get();
    if (!facultyDoc.exists || facultyDoc.data().institutionId !== (req.user.institutionId || req.user.uid)) {
      return res.status(400).json({ error: 'Invalid faculty selected' });
    }

    const courseData = {
      name,
      facultyId,
      description: description || '',
      duration: duration || '',
      requirements: requirements || '',
      level: level || 'Diploma',
      capacity: capacity || 50,
      enrolledCount: 0,
      status: 'active',
      institutionId: req.user.institutionId || req.user.uid,
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
    
    // Verify course belongs to this institution
    const courseDoc = await db.collection(collections.COURSES).doc(id).get();
    if (!courseDoc.exists || courseDoc.data().institutionId !== (req.user.institutionId || req.user.uid)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { name, description, duration, requirements, level, capacity } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(duration && { duration }),
      ...(requirements !== undefined && { requirements }),
      ...(level && { level }),
      ...(capacity !== undefined && { capacity }),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
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
    
    // Verify course belongs to this institution
    const courseDoc = await db.collection(collections.COURSES).doc(id).get();
    if (!courseDoc.exists || courseDoc.data().institutionId !== (req.user.institutionId || req.user.uid)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    await db.collection(collections.COURSES).doc(id).delete();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== APPLICATIONS ====================
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

// Update application status - WITH CAPACITY & WAITING LIST
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

    // Verify application belongs to this institution
    if (application.institutionId !== (req.user.institutionId || req.user.uid)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Handle admission with capacity check
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

// ==================== ADMISSIONS ====================
// Publish admissions
router.post('/admissions/publish', async (req, res) => {
  try {
    const { title, message, deadline } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const admissionData = {
      institutionId: req.user.institutionId || req.user.uid,
      title,
      message,
      deadline: deadline || null,
      published: true,
      publishedAt: new Date().toISOString(),
      publishedBy: req.user.uid
    };

    const docRef = await db.collection(collections.ADMISSIONS).add(admissionData);
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