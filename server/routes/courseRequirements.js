const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');
const { checkCourseEligibility } = require('../utils/eligibilityChecker');

const router = express.Router();

/**
 * POST /api/course-requirements/:courseId
 * Create/update course requirements for a specific course
 * Only institution can create requirements for their courses
 */
router.post('/:courseId', verifyToken, checkRole(['institution', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { requiredSubjects, additionalSubjects, minimumOverallPercentage, minimumRequiredSubjectsNeeded } = req.body;

    // Verify course exists and user owns it
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courseDoc.data();
    if (course.institutionId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to set requirements for this course' });
    }

    // Create or update requirements in COURSES collection
    const requirementsData = {
      courseId,
      institutionId: course.institutionId,
      requiredSubjects: requiredSubjects || [],
      additionalSubjects: additionalSubjects || [],
      minimumOverallPercentage: minimumOverallPercentage || 0,
      minimumRequiredSubjectsNeeded: minimumRequiredSubjectsNeeded || (requiredSubjects ? requiredSubjects.length : 0),
      updatedAt: new Date().toISOString()
    };

    // Update the course document with requirements
    await db.collection(collections.COURSES).doc(courseId).update({
      requiredSubjects: requiredSubjects || [],
      additionalSubjects: additionalSubjects || [],
      minimumOverallPercentage: minimumOverallPercentage || 0,
      minimumRequiredSubjectsNeeded: minimumRequiredSubjectsNeeded || (requiredSubjects ? requiredSubjects.length : 0),
      requirementsUpdatedAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Course requirements saved successfully',
      requirements: requirementsData
    });
  } catch (error) {
    console.error('Error creating course requirements:', error);
    res.status(500).json({ message: 'Error creating course requirements', error: error.message });
  }
});

/**
 * GET /api/course-requirements/:courseId
 * Get requirements for a specific course
 */
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courseDoc.data();
    const requirements = {
      courseId,
      courseName: course.courseName,
      institutionId: course.institutionId,
      requiredSubjects: course.requiredSubjects || [],
      additionalSubjects: course.additionalSubjects || [],
      minimumOverallPercentage: course.minimumOverallPercentage || 0,
      minimumRequiredSubjectsNeeded: course.minimumRequiredSubjectsNeeded || 0
    };

    if (!requirements.requiredSubjects.length && !requirements.additionalSubjects.length) {
      return res.status(404).json({ message: 'No requirements set for this course' });
    }

    res.json(requirements);
  } catch (error) {
    console.error('Error fetching course requirements:', error);
    res.status(500).json({ message: 'Error fetching course requirements', error: error.message });
  }
});

/**
 * PUT /api/course-requirements/:courseId
 * Update course requirements
 */
router.put('/:courseId', verifyToken, checkRole(['institution', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { requiredSubjects, additionalSubjects, minimumOverallPercentage, minimumRequiredSubjectsNeeded } = req.body;

    // Verify course exists and user owns it
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courseDoc.data();
    if (course.institutionId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update requirements for this course' });
    }

    // Update requirements
    const updateData = {};
    if (requiredSubjects !== undefined) updateData.requiredSubjects = requiredSubjects;
    if (additionalSubjects !== undefined) updateData.additionalSubjects = additionalSubjects;
    if (minimumOverallPercentage !== undefined) updateData.minimumOverallPercentage = minimumOverallPercentage;
    if (minimumRequiredSubjectsNeeded !== undefined) updateData.minimumRequiredSubjectsNeeded = minimumRequiredSubjectsNeeded;
    updateData.requirementsUpdatedAt = new Date().toISOString();

    await db.collection(collections.COURSES).doc(courseId).update(updateData);

    const updatedDoc = await db.collection(collections.COURSES).doc(courseId).get();
    const requirements = updatedDoc.data();

    res.json({
      message: 'Course requirements updated successfully',
      requirements
    });
  } catch (error) {
    console.error('Error updating course requirements:', error);
    res.status(500).json({ message: 'Error updating course requirements', error: error.message });
  }
});

/**
 * DELETE /api/course-requirements/:courseId
 * Delete course requirements
 */
router.delete('/:courseId', verifyToken, checkRole(['institution', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course exists and user owns it
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courseDoc.data();
    if (course.institutionId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete requirements for this course' });
    }

    // Remove requirements fields
    await db.collection(collections.COURSES).doc(courseId).update({
      requiredSubjects: [],
      additionalSubjects: [],
      minimumOverallPercentage: 0,
      minimumRequiredSubjectsNeeded: 0,
      requirementsUpdatedAt: new Date().toISOString()
    });

    res.json({ message: 'Course requirements deleted successfully' });
  } catch (error) {
    console.error('Error deleting course requirements:', error);
    res.status(500).json({ message: 'Error deleting course requirements', error: error.message });
  }
});

/**
 * POST /api/course-requirements/:courseId/check-eligibility
 * Check if a student is eligible for a course
 * Requires student transcript
 */
router.post('/:courseId/check-eligibility', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentTranscript } = req.body;

    if (!studentTranscript) {
      return res.status(400).json({ message: 'Student transcript is required' });
    }

    // Get course
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = courseDoc.data();
    
    // If no requirements set, all students can apply
    if (!course.requiredSubjects || course.requiredSubjects.length === 0) {
      return res.json({ 
        message: 'No specific requirements for this course. All students can apply.',
        isEligible: true,
        matchPercentage: 100,
        reasons: ['No specific eligibility criteria set for this course']
      });
    }

    // Check eligibility
    const eligibilityResult = checkCourseEligibility(studentTranscript, course);

    res.json(eligibilityResult);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ message: 'Error checking eligibility', error: error.message });
  }
});

/**
 * GET /api/course-requirements/institution/:institutionId
 * Get all course requirements for an institution
 */
router.get('/institution/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;

    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', institutionId)
      .where('requiredSubjects', '!=', [])
      .orderBy('requiredSubjects')
      .orderBy('createdAt', 'desc')
      .get();

    const requirements = [];
    snapshot.forEach(doc => {
      const course = doc.data();
      if (course.requiredSubjects && course.requiredSubjects.length > 0) {
        requirements.push({
          courseId: doc.id,
          courseName: course.courseName,
          institutionId: course.institutionId,
          requiredSubjects: course.requiredSubjects || [],
          additionalSubjects: course.additionalSubjects || [],
          minimumOverallPercentage: course.minimumOverallPercentage || 0,
          minimumRequiredSubjectsNeeded: course.minimumRequiredSubjectsNeeded || 0
        });
      }
    });

    res.json(requirements);
  } catch (error) {
    console.error('Error fetching institution course requirements:', error);
    res.status(500).json({ message: 'Error fetching course requirements', error: error.message });
  }
});

module.exports = router;
