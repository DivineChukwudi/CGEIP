const express = require('express');
const { db, collections } = require('../config/firebase');

const router = express.Router();

// Get all institutions (public)
router.get('/institutions', async (req, res) => {
  try {
    // Get admin-created institutions
    const adminSnapshot = await db.collection(collections.INSTITUTIONS).get();
    const institutions = adminSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      location: doc.data().location,
      contact: doc.data().contact,
      website: doc.data().website
    }));
    console.log(`✅ Found ${institutions.length} admin-created institutions`);

    // Get self-registered institutions (users with role='institution')
    const usersSnapshot = await db.collection(collections.USERS)
      .where('role', '==', 'institution')
      .get();
    
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      institutions.push({
        id: doc.id,
        name: userData.institutionName || userData.name || 'Institution',
        description: userData.description || '',
        location: userData.location || '',
        contact: userData.email || '',
        website: userData.website || ''
      });
      console.log(`✅ Added self-registered institution: ${userData.institutionName || userData.name}`);
    });

    // Sort by name
    institutions.sort((a, b) => a.name.localeCompare(b.name));

    res.json(institutions);
  } catch (error) {
    console.error('Public institutions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all faculties (public)
router.get('/faculties', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.FACULTIES).get();
    
    const faculties = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const facultyData = doc.data();
        
        // Get institution name
        const instDoc = await db.collection(collections.INSTITUTIONS)
          .doc(facultyData.institutionId)
          .get();
        
        return {
          id: doc.id,
          name: facultyData.name,
          description: facultyData.description,
          institutionId: facultyData.institutionId,
          institutionName: instDoc.exists ? instDoc.data().name : 'Unknown'
        };
      })
    );
    
    res.json(faculties);
  } catch (error) {
    console.error('Public faculties error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all courses (public)
router.get('/courses', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.COURSES).get();
    
    const courses = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const courseData = doc.data();
        
        // Get institution and faculty names
        const [instDoc, facDoc] = await Promise.all([
          db.collection(collections.INSTITUTIONS).doc(courseData.institutionId).get(),
          db.collection(collections.FACULTIES).doc(courseData.facultyId).get()
        ]);
        
        return {
          id: doc.id,
          name: courseData.name,
          description: courseData.description,
          level: courseData.level,
          duration: courseData.duration,
          requirements: courseData.requirements,
          capacity: courseData.capacity || 50,
          enrolledCount: courseData.enrolledCount || 0,
          institutionId: courseData.institutionId,
          facultyId: courseData.facultyId,
          institutionName: instDoc.exists ? instDoc.data().name : 'Unknown',
          facultyName: facDoc.exists ? facDoc.data().name : 'Unknown'
        };
      })
    );
    
    res.json(courses);
  } catch (error) {
    console.error('Public courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses by institution (public)
router.get('/institutions/:institutionId/courses', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', institutionId)
      .get();
    
    const courses = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const courseData = doc.data();
        
        const facDoc = await db.collection(collections.FACULTIES)
          .doc(courseData.facultyId)
          .get();
        
        return {
          id: doc.id,
          name: courseData.name,
          description: courseData.description,
          level: courseData.level,
          duration: courseData.duration,
          requirements: courseData.requirements,
          capacity: courseData.capacity || 50,
          enrolledCount: courseData.enrolledCount || 0,
          facultyName: facDoc.exists ? facDoc.data().name : 'Unknown'
        };
      })
    );
    
    res.json(courses);
  } catch (error) {
    console.error('Institution courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get faculties by institution (public)
router.get('/institutions/:institutionId/faculties', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    const snapshot = await db.collection(collections.FACULTIES)
      .where('institutionId', '==', institutionId)
      .get();
    
    const faculties = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description
    }));
    
    res.json(faculties);
  } catch (error) {
    console.error('Institution faculties error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search endpoint (public)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const query = q.toLowerCase();
    
    // Fetch all data
    const [institutionsSnap, facultiesSnap, coursesSnap] = await Promise.all([
      db.collection(collections.INSTITUTIONS).get(),
      db.collection(collections.FACULTIES).get(),
      db.collection(collections.COURSES).get()
    ]);
    
    // Filter institutions
    const institutions = institutionsSnap.docs
      .filter(doc => {
        const data = doc.data();
        return (
          data.name.toLowerCase().includes(query) ||
          data.description.toLowerCase().includes(query) ||
          data.location.toLowerCase().includes(query)
        );
      })
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        location: doc.data().location,
        contact: doc.data().contact,
        website: doc.data().website
      }));
    
    // Filter faculties
    const faculties = await Promise.all(
      facultiesSnap.docs
        .filter(doc => {
          const data = doc.data();
          return (
            data.name.toLowerCase().includes(query) ||
            data.description.toLowerCase().includes(query)
          );
        })
        .map(async doc => {
          const facultyData = doc.data();
          const instDoc = await db.collection(collections.INSTITUTIONS)
            .doc(facultyData.institutionId)
            .get();
          
          return {
            id: doc.id,
            name: facultyData.name,
            description: facultyData.description,
            institutionName: instDoc.exists ? instDoc.data().name : 'Unknown'
          };
        })
    );
    
    // Filter courses
    const courses = await Promise.all(
      coursesSnap.docs
        .filter(doc => {
          const data = doc.data();
          return (
            data.name.toLowerCase().includes(query) ||
            data.description.toLowerCase().includes(query) ||
            data.level.toLowerCase().includes(query) ||
            data.requirements.toLowerCase().includes(query)
          );
        })
        .map(async doc => {
          const courseData = doc.data();
          const [instDoc, facDoc] = await Promise.all([
            db.collection(collections.INSTITUTIONS).doc(courseData.institutionId).get(),
            db.collection(collections.FACULTIES).doc(courseData.facultyId).get()
          ]);
          
          return {
            id: doc.id,
            name: courseData.name,
            description: courseData.description,
            level: courseData.level,
            duration: courseData.duration,
            requirements: courseData.requirements,
            capacity: courseData.capacity || 50,
            enrolledCount: courseData.enrolledCount || 0,
            institutionName: instDoc.exists ? instDoc.data().name : 'Unknown',
            facultyName: facDoc.exists ? facDoc.data().name : 'Unknown'
          };
        })
    );
    
    res.json({
      query: q,
      results: {
        institutions,
        faculties,
        courses
      },
      totalResults: institutions.length + faculties.length + courses.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;