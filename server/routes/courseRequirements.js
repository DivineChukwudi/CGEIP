const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const CourseRequirement = require('../models/CourseRequirement');
const { checkCourseEligibility } = require('../utils/eligibilityChecker');
const auth = require('../middlewares/auth');

/**
 * POST /api/course-requirements/:courseId
 * Create course requirements for a specific course
 * Only institution can create requirements for their courses
 */
router.post('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { requiredSubjects, additionalSubjects, minimumOverallPercentage, minimumRequiredSubjectsNeeded } = req.body;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify user is the institution owner of this course
    if (course.institutionId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to set requirements for this course' });
    }

    // Check if requirements already exist
    let requirements = await CourseRequirement.findOne({ courseId });
    
    if (requirements) {
      // Update existing requirements
      requirements.requiredSubjects = requiredSubjects || requirements.requiredSubjects;
      requirements.additionalSubjects = additionalSubjects || requirements.additionalSubjects;
      requirements.minimumOverallPercentage = minimumOverallPercentage ?? requirements.minimumOverallPercentage;
      requirements.minimumRequiredSubjectsNeeded = minimumRequiredSubjectsNeeded || requiredSubjects.length;
      requirements.updatedAt = new Date();
      await requirements.save();
    } else {
      // Create new requirements
      requirements = new CourseRequirement({
        courseId,
        institutionId: course.institutionId,
        requiredSubjects: requiredSubjects || [],
        additionalSubjects: additionalSubjects || [],
        minimumOverallPercentage: minimumOverallPercentage || 0,
        minimumRequiredSubjectsNeeded: minimumRequiredSubjectsNeeded || (requiredSubjects ? requiredSubjects.length : 0)
      });
      await requirements.save();
    }

    res.status(201).json({
      message: 'Course requirements saved successfully',
      requirements
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

    const requirements = await CourseRequirement.findOne({ courseId })
      .populate('courseId', 'courseName duration description')
      .populate('institutionId', 'institutionName');

    if (!requirements) {
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
router.put('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { requiredSubjects, additionalSubjects, minimumOverallPercentage, minimumRequiredSubjectsNeeded } = req.body;

    // Verify course exists and user owns it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.institutionId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update requirements for this course' });
    }

    const requirements = await CourseRequirement.findOneAndUpdate(
      { courseId },
      {
        requiredSubjects: requiredSubjects || undefined,
        additionalSubjects: additionalSubjects || undefined,
        minimumOverallPercentage: minimumOverallPercentage !== undefined ? minimumOverallPercentage : undefined,
        minimumRequiredSubjectsNeeded: minimumRequiredSubjectsNeeded || undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!requirements) {
      return res.status(404).json({ message: 'Course requirements not found' });
    }

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
router.delete('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course exists and user owns it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.institutionId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete requirements for this course' });
    }

    const result = await CourseRequirement.findOneAndDelete({ courseId });

    if (!result) {
      return res.status(404).json({ message: 'Course requirements not found' });
    }

    res.json({ message: 'Course requirements deleted successfully' });
  } catch (error) {
    console.error('Error deleting course requirements:', error);
    res.status(500).json({ message: 'Error deleting course requirements', error: error.message });
  }
});

/**
 * POST /api/course-requirements/:courseId/check-eligibility
 * Check if a student is eligible for a course
 * Requires student ID and their transcript
 */
router.post('/:courseId/check-eligibility', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentTranscript } = req.body;

    if (!studentTranscript) {
      return res.status(400).json({ message: 'Student transcript is required' });
    }

    // Get course requirements
    const requirements = await CourseRequirement.findOne({ courseId });
    
    if (!requirements) {
      return res.status(404).json({ 
        message: 'No specific requirements for this course. All students can apply.',
        isEligible: true,
        matchPercentage: 100,
        reasons: ['No specific eligibility criteria set for this course']
      });
    }

    // Check eligibility
    const eligibilityResult = await checkCourseEligibility(studentTranscript, requirements);

    res.json(eligibilityResult);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ message: 'Error checking eligibility', error: error.message });
  }
});

/**
 * GET /api/institution/:institutionId/course-requirements
 * Get all course requirements for an institution
 */
router.get('/institution/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;

    const requirements = await CourseRequirement.find({ institutionId })
      .populate('courseId', 'courseName duration')
      .sort({ createdAt: -1 });

    res.json(requirements);
  } catch (error) {
    console.error('Error fetching institution course requirements:', error);
    res.status(500).json({ message: 'Error fetching course requirements', error: error.message });
  }
});

module.exports = router;
