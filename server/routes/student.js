const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');
const { upload } = require('../utils/fileUpload');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

const router = express.Router();

router.use(verifyToken);
router.use(checkRole(['student']));

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

// REQUIREMENT #2: Enhanced eligibility check with detailed feedback
function checkCourseEligibility(student, course) {
  const studentQualifications = student.qualifications || [];
  const requiredLevel = course.level || 'Certificate';

  // If student has no qualifications, allow them to apply for Certificate/Diploma level
  // They should update their profile after enrolling
  if (studentQualifications.length === 0) {
    if (requiredLevel === 'Certificate' || requiredLevel === 'Diploma') {
      return { 
        eligible: true,
        message: 'Please update your profile with your qualifications after enrollment'
      };
    }
  }

  // Qualification hierarchy
  const qualificationHierarchy = {
    'High School': 0,
    'Certificate': 1,
    'Diploma': 2,
    'Degree': 3,
    'Masters': 4,
    'PhD': 5
  };

  const studentHighestLevel = Math.max(
    ...studentQualifications.map(q => qualificationHierarchy[q] || 0),
    0
  );

  const requiredLevelValue = qualificationHierarchy[requiredLevel] || 0;

  // DESCENDING ELIGIBILITY: Higher qualifications can apply for equal or LOWER level courses
  if (studentHighestLevel >= requiredLevelValue) {
    // Level requirement met, now check subject prerequisites
    const eligibilityStatus = checkSubjectPrerequisites(student, course);
    return eligibilityStatus;
  }

  // If not eligible, provide detailed feedback
  return {
    eligible: false,
    reason: `You do not meet the minimum qualification for this program. A ${requiredLevel} is required.`,
    requiredQualification: requiredLevel,
    yourQualifications: studentQualifications.join(', ') || 'None',
    message: `Your highest qualification is ${studentQualifications[studentQualifications.length - 1] || 'not listed'}, but this program requires ${requiredLevel}`
  };
}

// NEW: Check if student has required subjects for the course
function checkSubjectPrerequisites(student, course) {
  const studentSubjects = student.subjects || [];
  const studentTranscript = student.transcriptId ? student.transcript : null;
  const courseRequiredSubjects = course.requiredSubjects || [];
  const coursePreferredSubjects = course.preferredSubjects || [];
  const isGeneralCourse = course.isGeneralCourse !== false; // Default to general if not specified
  
  // Extract subject names and grades from different sources
  let studentSubjectData = [];
  
  // From transcript uploaded subjects
  if (Array.isArray(studentSubjects)) {
    studentSubjectData = studentSubjects.map(s => {
      if (typeof s === 'string') {
        return { name: s.toLowerCase(), grade: null, gradeValue: 0 };
      }
      if (s.subject) {
        return { 
          name: s.subject.toLowerCase(), 
          grade: s.grade || null,
          gradeValue: s.gradeValue || 0
        };
      }
      return null;
    }).filter(s => s);
  }

  console.log(`🎓 DETAILED Subject Check for "${course.name}":`);
  console.log(`   ═══════════════════════════════════════════`);
  console.log(`   📚 Student Subjects (${studentSubjectData.length}):`);
  studentSubjectData.forEach(s => {
    console.log(`      • ${s.name} ${s.gradeValue ? `(${s.grade})` : ''}`);
  });
  
  console.log(`   ✋ Required Subjects (${courseRequiredSubjects.length}):`);
  courseRequiredSubjects.forEach(s => {
    console.log(`      • ${s.toLowerCase()}`);
  });
  
  console.log(`   💡 Preferred Subjects (${coursePreferredSubjects.length}):`);
  coursePreferredSubjects.forEach(s => {
    console.log(`      • ${s.toLowerCase()}`);
  });
  console.log(`   ═══════════════════════════════════════════`);

  // If no required subjects, it's a general course
  if (!courseRequiredSubjects || courseRequiredSubjects.length === 0) {
    console.log(`   ✅ No specific subjects required (General Course)`);
    return {
      eligible: true,
      message: 'This is a general course - no specific subjects required',
      visible: true,
      subjectPrerequisites: null
    };
  }

  // Detailed subject matching with fuzzy matching
  const findSubjectMatch = (requiredSubject, studentSubjects) => {
    const required = requiredSubject.toLowerCase().trim();
    
    return studentSubjects.find(studentSubj => {
      const student = studentSubj.name.toLowerCase();
      
      // Exact match
      if (student === required) return true;
      
      // Partial word matches (e.g., "Maths" matches "Mathematics")
      const requiredWords = required.split(/[\s-_]/);
      const studentWords = student.split(/[\s-_]/);
      
      // Check if any student word contains the required word
      return requiredWords.some(reqWord => 
        studentWords.some(studWord => 
          studWord.includes(reqWord) || reqWord.includes(studWord)
        )
      );
    });
  };

  // Check required subjects (STRICT)
  const requiredMatches = courseRequiredSubjects.map(required => {
    const match = findSubjectMatch(required, studentSubjectData);
    return {
      subject: required,
      found: !!match,
      studentHas: match || null
    };
  });

  const allRequiredMet = requiredMatches.every(r => r.found);
  const missingRequired = requiredMatches.filter(r => !r.found);

  console.log(`   🔍 Required Subject Analysis:`);
  requiredMatches.forEach(r => {
    console.log(`      ${r.found ? '✅' : '❌'} ${r.subject} ${r.found ? `(student has: ${r.studentHas.name})` : '(MISSING)'}`);
  });

  // Check preferred subjects (FLEXIBLE - bonus points)
  let preferredScore = 0;
  if (coursePreferredSubjects.length > 0) {
    const preferredMatches = coursePreferredSubjects.map(preferred => {
      const match = findSubjectMatch(preferred, studentSubjectData);
      if (match) preferredScore += 20; // 20 points per preferred subject
      return {
        subject: preferred,
        found: !!match
      };
    });

    console.log(`   💫 Preferred Subject Analysis (Bonus):`);
    preferredMatches.forEach(p => {
      console.log(`      ${p.found ? '✅' : '⏭️'} ${p.subject} ${p.found ? '(+20 bonus points)' : '(optional)'}`);
    });
  }

  // Calculate eligibility score
  let eligibilityScore = 0;
  let eligibilityReason = [];

  if (allRequiredMet) {
    eligibilityScore = 100; // Base score for meeting all requirements
    eligibilityReason.push('Has all required subjects');
    
    if (preferredScore > 0) {
      eligibilityReason.push(`+${preferredScore} bonus for preferred subjects`);
    }

    console.log(`   🎯 VERDICT: ✅ ELIGIBLE (Score: ${eligibilityScore + preferredScore}%)`);
    console.log(`      Reason: ${eligibilityReason.join(', ')}`);

    return {
      eligible: true,
      message: `You have all required subjects. ${preferredScore > 0 ? `Bonus: You also have ${preferredScore / 20} preferred subject(s)!` : ''}`,
      visible: true,
      eligibilityScore: eligibilityScore + preferredScore,
      subjectPrerequisites: {
        allRequiredMet: true,
        requiredSubjects: requiredMatches,
        preferredSubjects: coursePreferredSubjects.map(p => ({
          subject: p,
          found: coursePreferredSubjects.some(pref => 
            findSubjectMatch(pref, studentSubjectData)
          )
        })),
        totalScore: eligibilityScore + preferredScore
      }
    };
  }

  // If missing required subjects
  const missingCount = missingRequired.length;
  const percentageMissing = Math.round((missingCount / courseRequiredSubjects.length) * 100);

  console.log(`   🎯 VERDICT: ❌ NOT ELIGIBLE`);
  console.log(`      Missing: ${missingRequired.map(m => m.subject).join(', ')}`);
  console.log(`      ${percentageMissing}% of required subjects missing`);
  console.log(`      Course Visibility: ${isGeneralCourse ? 'HIDDEN (General course allows admin review)' : 'HIDDEN (Specific requirements not met)'}`);

  // Return NOT eligible - course will be hidden
  return {
    eligible: false,
    message: `You're missing required subjects: ${missingRequired.map(m => m.subject).join(', ')}. You need these subjects to apply for this course.`,
    visible: false, // IMPORTANT: Hide from course list
    reason: `This course requires: ${courseRequiredSubjects.join(', ')}`,
    missingSubjects: missingRequired.map(m => m.subject),
    subjectPrerequisites: {
      allRequiredMet: false,
      requiredSubjects: requiredMatches,
      missingCount: missingCount,
      percentageMissing: percentageMissing,
      totalScore: 0
    }
  };
}

// REQUIREMENT #4: Calculate job match and check if student should be notified
function calculateJobMatchAndEligibility(student, job) {
  let score = 0;
  let eligible = false;
  let reason = '';

  // Base eligibility: student should have transcript uploaded
  if (student.transcriptId && student.transcriptVerified) {
    score += 40;
    reason = 'Verified graduate';
  } else if (student.transcriptId) {
    score += 20;
    reason = 'Transcript pending verification';
  } else {
    score += 5;
    reason = 'No transcript uploaded';
  }

  // Qualifications match (40 points)
  if (student.qualifications && job.qualifications) {
    const studentQuals = student.qualifications.map(q => 
      typeof q === 'string' ? q.toLowerCase() : q?.qualificationLevel?.toLowerCase() || ''
    );
    const jobQuals = job.qualifications.toLowerCase();
    
    const hasRequiredQual = studentQuals.some(q => q && jobQuals.includes(q));
    if (hasRequiredQual) {
      score += 40;
      reason = 'Qualifications match';
    } else {
      // Partial match (20 points)
      const partialMatch = studentQuals.some(q => 
        q && jobQuals.split(' ').some(word => word.includes(q) || q.includes(word))
      );
      if (partialMatch) {
        score += 20;
        reason = 'Partial qualifications match';
      }
    }
  }

  // Work experience (20 points)
  if (student.workExperience && student.workExperience.length > 0) {
    score += 20;
  }

  // Eligible if they have at least some qualifications or transcript
  // This allows students to browse and apply even if not fully qualified
  eligible = score >= 5;

  return { 
    score: Math.min(score, 100), 
    eligible,
    reason: `${reason} (${Math.min(score, 100)}% match)`
  };
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

router.get('/profile', async (req, res) => {
  try {
    const userDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const userData = userDoc.data();
    delete userData.password;
    
    if (userData.transcriptId) {
      const transcriptDoc = await db.collection(collections.TRANSCRIPTS)
        .doc(userData.transcriptId).get();
      userData.transcript = transcriptDoc.exists ? transcriptDoc.data() : null;
    }
    
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
    delete updateData.isGraduate;
    delete updateData.transcriptId;

    await db.collection(collections.USERS).doc(req.user.uid).update(updateData);
    
    await createNotification(req.user.uid, {
      type: 'general',
      title: 'Profile Updated',
      message: 'Your profile has been successfully updated.'
    });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INSTITUTIONS & COURSES
// ============================================

router.get('/institutions', async (req, res) => {
  try {
    console.log('Student fetching ALL institutions...');
    
    // Get admin-created institutions from INSTITUTIONS collection
    const institutionsSnapshot = await db.collection(collections.INSTITUTIONS)
      .where('status', '==', 'active')
      .get();
    
    // Get self-registered institutions from USERS collection
    const institutionUsersSnapshot = await db.collection(collections.USERS)
      .where('role', '==', 'institution')
      .where('status', '==', 'active')
      .get();
    
    const institutions = [];
    const processedEmails = new Set();
    
    // Process admin-created institutions
    institutionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      institutions.push({
        id: doc.id,
        name: data.name,
        description: data.description || '',
        location: data.location || '',
        contact: data.contact || '',
        website: data.website || '',
        email: data.email || '',
        status: 'active',
        source: 'admin-created',
        createdAt: data.createdAt
      });
      
      if (data.email) {
        processedEmails.add(data.email.toLowerCase());
      }
    });
    
    console.log(`Found ${institutionsSnapshot.size} admin-created institutions`);
    
    // Process self-registered institutions
    institutionUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email.toLowerCase();
      
      // Skip if already in institutions
      if (!processedEmails.has(email)) {
        institutions.push({
          id: doc.id,  // Use user UID as institution ID
          name: data.name,
          description: `${data.name} - Higher Learning Institution`,
          location: 'Lesotho',
          contact: data.email,
          website: '',
          email: data.email,
          status: 'active',
          source: 'self-registered',
          createdAt: data.createdAt
        });
        
        console.log(`Added self-registered institution: ${data.name}`);
      }
    });
    
    // Sort alphabetically
    institutions.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Total ${institutions.length} institutions returned to student`);
    
    res.json(institutions);
  } catch (error) {
    console.error('❌ Get institutions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get faculties for an institution
router.get('/institutions/:institutionId/faculties', async (req, res) => {
  try {
    const { institutionId } = req.params;
    console.log('Fetching faculties for institution:', institutionId);
    
    const snapshot = await db.collection(collections.FACULTIES)
      .where('institutionId', '==', institutionId)
      .get();
    
    console.log(`Found ${snapshot.size} faculties for institution`);
    
    const faculties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(faculties);
  } catch (error) {
    console.error('❌ Get faculties error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses for a specific faculty
router.get('/institutions/:institutionId/faculties/:facultyId/courses', async (req, res) => {
  try {
    const { institutionId, facultyId } = req.params;
    console.log('🔍 Fetching courses for faculty:', facultyId, 'in institution:', institutionId);
    
    // Get student profile for eligibility check
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();
    
    // Get ALL courses for this faculty (don't filter by status yet)
    const allCoursesSnapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', institutionId)
      .where('facultyId', '==', facultyId)
      .get();
    
    console.log(`📋 Total courses found for this faculty: ${allCoursesSnapshot.size}`);
    
    // Filter to only active courses (treat missing status as active)
    const activeCourses = allCoursesSnapshot.docs.filter(doc => {
      const status = doc.data().status;
      const isActive = status === 'active' || status === undefined;
      const courseName = doc.data().name;
      console.log(`  - ${courseName} (status: ${status || 'undefined → treating as active'})`);
      return isActive;
    });
    
    console.log(`✅ Found ${activeCourses.length} ACTIVE courses for faculty`);
    
    const courses = await Promise.all(activeCourses.map(async doc => {
      const courseData = doc.data();
      
      const facultyDoc = await db.collection(collections.FACULTIES)
        .doc(courseData.facultyId).get();
      
      const appCount = await db.collection(collections.APPLICATIONS)
        .where('courseId', '==', doc.id)
        .get();

      // REQUIREMENT #2: Check eligibility for this course
      const eligibility = checkCourseEligibility(student, courseData);
      
      console.log(`  ✓ Course: ${courseData.name} (ID: ${doc.id}), Eligible: ${eligibility.eligible}, Visible: ${eligibility.visible}`);
      
      return {
        id: doc.id,
        ...courseData,
        faculty: facultyDoc.exists ? facultyDoc.data() : null,
        applicationCount: appCount.size,
        availableSpots: courseData.capacity ? courseData.capacity - appCount.size : null,
        // Add eligibility info
        eligible: eligibility.eligible,
        visible: eligibility.visible !== false, // IMPORTANT: Filter based on visibility
        eligibilityReason: eligibility.reason || eligibility.message,
        requiredQualification: eligibility.requiredQualification,
        yourQualifications: eligibility.yourQualifications
      };
    }));

    // FILTER: Only return visible/eligible courses (automatic filtering)
    const visibleCourses = courses.filter(course => course.visible);
    const hiddenCount = courses.length - visibleCourses.length;

    console.log(`📤 Returning ${visibleCourses.length} visible courses to student (${hiddenCount} hidden due to eligibility)`);
    res.json(visibleCourses);
  } catch (error) {
    console.error('❌ Get courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// REQUIREMENT #2: Get courses with eligibility check
router.get('/institutions/:institutionId/courses', async (req, res) => {
  try {
    const { institutionId } = req.params;
    console.log('📚 Fetching courses for institution:', institutionId);
    
    // Check if it's an admin-created institution
    let instDoc = await db.collection(collections.INSTITUTIONS)
      .doc(institutionId).get();
    
    // If not found, check if it's a self-registered institution (user)
    if (!instDoc.exists) {
      console.log('⚠️  Not found in INSTITUTIONS, checking USERS...');
      const userDoc = await db.collection(collections.USERS).doc(institutionId).get();
      
      if (!userDoc.exists || userDoc.data().role !== 'institution') {
        console.error('❌ Institution not found:', institutionId);
        return res.status(404).json({ error: 'Institution not found' });
      }
      
      console.log('✅ Found institution user:', userDoc.data().name);
    } else {
      console.log('✅ Found institution document:', instDoc.data().name);
    }

    // Get student profile for eligibility check
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();
    
    const snapshot = await db.collection(collections.COURSES)
      .where('institutionId', '==', institutionId)
      .where('status', '==', 'active')
      .get();
    
    console.log(`✅ Found ${snapshot.size} courses for institution`);
    
    const courses = await Promise.all(snapshot.docs.map(async doc => {
      const courseData = doc.data();
      
      const facultyDoc = await db.collection(collections.FACULTIES)
        .doc(courseData.facultyId).get();
      
      const appCount = await db.collection(collections.APPLICATIONS)
        .where('courseId', '==', doc.id)
        .get();

      // REQUIREMENT #2: Check eligibility for this course
      const eligibility = checkCourseEligibility(student, courseData);
      
      console.log(`  ✓ Course: ${courseData.name} (ID: ${doc.id}), Eligible: ${eligibility.eligible}, Visible: ${eligibility.visible}`);
      
      return {
        id: doc.id,
        ...courseData,
        faculty: facultyDoc.exists ? facultyDoc.data() : null,
        applicationCount: appCount.size,
        availableSpots: courseData.capacity ? courseData.capacity - appCount.size : null,
        // Add eligibility info
        eligible: eligibility.eligible,
        visible: eligibility.visible !== false, // IMPORTANT: Filter based on visibility
        eligibilityReason: eligibility.reason || eligibility.message,
        requiredQualification: eligibility.requiredQualification,
        yourQualifications: eligibility.yourQualifications
      };
    }));

    // FILTER: Only return visible/eligible courses (automatic filtering)
    const visibleCourses = courses.filter(course => course.visible);
    const hiddenCount = courses.length - visibleCourses.length;

    console.log(`📤 Returning ${visibleCourses.length} visible courses to student (${hiddenCount} hidden due to eligibility)`);
    res.json(visibleCourses);
  } catch (error) {
    console.error('❌ Get courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COURSE APPLICATIONS (REQUIREMENT #2 ENFORCED)
// ============================================

router.post('/applications', async (req, res) => {
  try {
    const { institutionId, courseId, documents } = req.body;

    // Check if student already SELECTED an institution
    const selectedAdmission = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('selected', '==', true)
      .get();

    if (!selectedAdmission.empty) {
      return res.status(400).json({ 
        error: 'You have already selected an institution and cannot apply to others.' 
      });
    }

    // Check max 2 applications per institution
    const existingApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('institutionId', '==', institutionId)
      .get();

    if (existingApps.size >= 2) {
      return res.status(400).json({ 
        error: 'You can only apply to a maximum of 2 courses per institution' 
      });
    }

    // Check duplicate course application
    const duplicateApp = existingApps.docs.find(doc => 
      doc.data().courseId === courseId
    );
    
    if (duplicateApp) {
      return res.status(400).json({ 
        error: 'You have already applied for this course' 
      });
    }

    // Validate course exists and is active
    const courseDoc = await db.collection(collections.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseDoc.data();
    if (course.status !== 'active') {
      return res.status(400).json({ error: 'This course is not accepting applications' });
    }

    // Get student info
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();

    // REQUIREMENT #2: Strict eligibility check
    const eligibility = checkCourseEligibility(student, course);
    console.log('Eligibility check:', {
      studentId: req.user.uid,
      courseId,
      courseName: course.name,
      courseLevel: course.level,
      studentQualifications: student?.qualifications,
      eligibility
    });
    
    if (!eligibility.eligible) {
      return res.status(403).json({ 
        error: 'You do not meet the qualification requirements for this course',
        reason: eligibility.reason,
        requiredQualification: eligibility.requiredQualification,
        yourQualifications: eligibility.yourQualifications,
        message: 'Please update your profile with the required qualifications before applying.'
      });
    }

    // Check course capacity
    if (course.capacity) {
      const currentApps = await db.collection(collections.APPLICATIONS)
        .where('courseId', '==', courseId)
        .where('status', 'in', ['pending', 'admitted'])
        .get();
      
      if (currentApps.size >= course.capacity) {
        return res.status(400).json({ 
          error: 'This course has reached its maximum capacity' 
        });
      }
    }

    // Create application
    const applicationData = {
      studentId: req.user.uid,
      institutionId,
      courseId,
      documents: documents || [],
      status: 'pending',
      selected: false,
      appliedAt: new Date().toISOString(),
      studentInfo: {
        name: student.name,
        email: student.email,
        phone: student.phone,
        qualifications: student.qualifications || []
      }
    };

    const docRef = await db.collection(collections.APPLICATIONS).add(applicationData);
    
    await createNotification(req.user.uid, {
      type: 'admission',
      title: 'Application Submitted',
      message: `Your application for ${course.name} has been submitted successfully.`,
      relatedId: docRef.id
    });
    
    res.status(201).json({ 
      id: docRef.id, 
      ...applicationData,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .get();
    
    const docs = snapshot.docs.sort((a, b) => {
      const dateA = new Date(a.data().appliedAt);
      const dateB = new Date(b.data().appliedAt);
      return dateB - dateA;
    });
    
    const applications = await Promise.all(docs.map(async doc => {
      const appData = doc.data();
      
      const [institutionDoc, courseDoc] = await Promise.all([
        db.collection(collections.INSTITUTIONS).doc(appData.institutionId).get(),
        db.collection(collections.COURSES).doc(appData.courseId).get()
      ]);
      
      return {
        id: doc.id,
        ...appData,
        institution: institutionDoc.exists ? institutionDoc.data() : null,
        course: courseDoc.exists ? courseDoc.data() : null
      };
    }));

    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INSTITUTION SELECTION
// ============================================

router.post('/applications/:id/select', async (req, res) => {
  try {
    const { id } = req.params;

    const appDoc = await db.collection(collections.APPLICATIONS).doc(id).get();
    
    if (!appDoc.exists || appDoc.data().studentId !== req.user.uid) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appDoc.data();

    if (application.status !== 'admitted') {
      return res.status(400).json({ 
        error: 'You can only select applications that have been admitted' 
      });
    }

    if (application.selected) {
      return res.status(400).json({ 
        error: 'This application is already selected' 
      });
    }

    const otherSelected = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('selected', '==', true)
      .get();

    if (!otherSelected.empty) {
      return res.status(400).json({ 
        error: 'You have already selected another institution' 
      });
    }

    await db.collection(collections.APPLICATIONS).doc(id).update({
      selected: true,
      selectedAt: new Date().toISOString()
    });

    const otherAdmittedApps = await db.collection(collections.APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('status', '==', 'admitted')
      .get();

    const promises = [];
    
    for (const doc of otherAdmittedApps.docs) {
      if (doc.id !== id) {
        const otherApp = doc.data();
        
        promises.push(
          doc.ref.update({ 
            status: 'rejected', 
            reason: 'Student selected another institution',
            rejectedAt: new Date().toISOString()
          })
        );

        const waitingList = await db.collection(collections.APPLICATIONS)
          .where('institutionId', '==', otherApp.institutionId)
          .where('courseId', '==', otherApp.courseId)
          .where('status', '==', 'waitlisted')
          .get();

        if (!waitingList.empty) {
          const sortedWaitlist = waitingList.docs.sort((a, b) => {
            const dateA = new Date(a.data().appliedAt);
            const dateB = new Date(b.data().appliedAt);
            return dateA - dateB;
          });

          const nextStudent = sortedWaitlist[0];
          const nextStudentData = nextStudent.data();
          
          promises.push(
            nextStudent.ref.update({
              status: 'admitted',
              admittedAt: new Date().toISOString(),
              promotedFromWaitlist: true
            })
          );

          promises.push(
            createNotification(nextStudentData.studentId, {
              type: 'admission',
              title: 'Congratulations! You\'ve been Admitted',
              message: 'You have been promoted from the waiting list and admitted to your chosen course.',
              relatedId: nextStudent.id
            })
          );
        }
      }
    }

    await Promise.all(promises);

    await createNotification(req.user.uid, {
      type: 'admission',
      title: 'Institution Selected',
      message: 'You have successfully selected your institution. Your other applications have been rejected.',
      relatedId: id
    });

    res.json({ 
      message: 'Institution selected successfully! Other applications rejected and waiting list students promoted.',
      waitlistPromoted: promises.length > 1
    });
  } catch (error) {
    console.error('Selection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TRANSCRIPT UPLOAD
// ============================================

router.post('/transcripts', upload.fields([
  { name: 'transcript', maxCount: 1 },
  { name: 'certificates', maxCount: 5 }
]), async (req, res) => {
  try {
    const { graduationYear, gpa, extraCurricularActivities, subjects, overallPercentage, qualificationLevel } = req.body;

    if (!req.files?.transcript || !graduationYear) {
      return res.status(400).json({
        error: 'Transcript file and graduation year are required'
      });
    }

    if (!qualificationLevel) {
      return res.status(400).json({
        error: 'Please select your qualification level'
      });
    }

    const year = parseInt(graduationYear);
    if (year < 2000 || year > new Date().getFullYear()) {
      return res.status(400).json({
        error: 'Please enter a valid graduation year'
      });
    }

    console.log('Uploading transcript to Cloudinary...');
    const transcriptUrl = await uploadToCloudinary(
      req.files.transcript[0],
      req.user.uid,
      'transcripts'
    );

    let certificateUrls = [];
    if (req.files?.certificates) {
      certificateUrls = await Promise.all(
        req.files.certificates.map(file =>
          uploadToCloudinary(file, req.user.uid, 'certificates')
        )
      );
    }

    // Parse subjects data
    let parsedSubjects = [];
    if (subjects) {
      try {
        parsedSubjects = JSON.parse(subjects);
      } catch (e) {
        console.error('Failed to parse subjects:', e);
      }
    }

    const transcriptData = {
      studentId: req.user.uid,
      transcriptUrl,
      certificates: certificateUrls,
      graduationYear: year,
      qualificationLevel, // ADDED: Store qualification level
      gpa: gpa ? parseFloat(gpa) : null,
      extraCurricularActivities: extraCurricularActivities
        ? JSON.parse(extraCurricularActivities)
        : [],
      // NEW: Store extracted subjects and grades
      subjects: parsedSubjects,
      overallPercentage: overallPercentage ? parseInt(overallPercentage) : null,
      uploadedAt: new Date().toISOString(),
      verified: false
    };

    const docRef = await db.collection(collections.TRANSCRIPTS).add(transcriptData);

    await db.collection(collections.USERS).doc(req.user.uid).update({
      isGraduate: true,
      transcriptId: docRef.id,
      transcriptVerified: false,
      qualifications: [qualificationLevel], // ADDED: Store as array with the selected level
      // Store overall percentage in user profile for quick access
      overallPercentage: transcriptData.overallPercentage,
      updatedAt: new Date().toISOString()
    });

    await createNotification(req.user.uid, {
      type: 'general',
      title: 'Transcript Uploaded Successfully',
      message: `Your academic transcript with ${parsedSubjects.length} subjects has been received. Admins will verify it shortly!`
    });

    // REQUIREMENT #4: Check for matching jobs and send notifications
    await notifyStudentOfMatchingJobs(req.user.uid);

    res.status(201).json({
      id: docRef.id,
      ...transcriptData,
      message: 'Transcript uploaded successfully! You can now apply for jobs once verified by admins.'
    });
  } catch (error) {
    console.error('Transcript upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload transcript'
    });
  }
});

// ============================================
// JOB OPPORTUNITIES (REQUIREMENT #4)
// ============================================

// REQUIREMENT #4: Helper function to notify student of matching jobs
async function notifyStudentOfMatchingJobs(studentId) {
  try {
    const studentDoc = await db.collection(collections.USERS).doc(studentId).get();
    const student = studentDoc.data();

    if (!student.isGraduate || !student.transcriptId) {
      return;
    }

    const jobsSnapshot = await db.collection(collections.JOBS)
      .where('status', '==', 'active')
      .get();

    let matchCount = 0;

    for (const jobDoc of jobsSnapshot.docs) {
      const job = jobDoc.data();
      const match = calculateJobMatchAndEligibility(student, job);

      if (match.eligible) {
        await createNotification(studentId, {
          type: 'job',
          title: 'New Job Opportunity Matches Your Profile!',
          message: `${job.title} at ${job.company} - ${match.score}% match. Check it out in the Jobs section!`,
          relatedId: jobDoc.id
        });
        matchCount++;
      }
    }

    console.log(`Sent ${matchCount} job notifications to student ${studentId}`);
  } catch (error) {
    console.error('Error notifying student of jobs:', error);
  }
}

router.get('/jobs', async (req, res) => {
  try {
    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const student = studentDoc.data();

    const snapshot = await db.collection(collections.JOBS)
      .where('status', '==', 'active')
      .get();
    
    const jobs = await Promise.all(snapshot.docs.map(async doc => {
      const jobData = doc.data();
      
      const companyDoc = await db.collection(collections.USERS)
        .doc(jobData.companyId).get();
      
      // Calculate match and eligibility
      const match = calculateJobMatchAndEligibility(student, jobData);
      
      return {
        id: doc.id,
        ...jobData,
        company: companyDoc.exists ? companyDoc.data().name : 'Unknown Company',
        qualificationMatch: match.score,
        eligible: match.eligible,
        eligibilityReason: match.reason
      };
    }));

    // Show all active jobs - students can see them even if not fully qualified
    // The eligibility flag is still calculated for UI/UX purposes
    console.log(`📁 Returning ${jobs.length} active jobs to student`);
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/:jobId/apply', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter, cvUrl, cvMethod } = req.body;
    let finalCvUrl = cvUrl;

    // Determine which CV submission method is being used
    const hasFile = req.file && req.file.buffer;
    const hasUrl = cvUrl && cvUrl.trim();
    const submissionMethod = cvMethod || (hasFile ? 'file' : 'url');

    // CV is required - either file or URL
    if (!hasFile && !hasUrl) {
      return res.status(400).json({ 
        error: 'CV is required. Please either upload a file or provide a URL.' 
      });
    }

    // If using file upload method, upload to Cloudinary first
    if (hasFile) {
      try {
        console.log(`📁 Uploading CV file for student ${req.user.uid}...`);
        finalCvUrl = await uploadToCloudinary(req.file, req.user.uid, 'cv');
        console.log(`✅ CV uploaded successfully: ${finalCvUrl}`);
      } catch (uploadError) {
        return res.status(500).json({ 
          error: 'Failed to upload CV file: ' + uploadError.message 
        });
      }
    }

    // Check for duplicate application
    const existingApp = await db.collection(collections.JOB_APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .where('jobId', '==', jobId)
      .get();

    if (!existingApp.empty) {
      return res.status(400).json({ 
        error: 'You have already applied for this job' 
      });
    }

    const studentDoc = await db.collection(collections.USERS).doc(req.user.uid).get();
    const studentData = studentDoc.data();

    const jobDoc = await db.collection(collections.JOBS).doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDoc.data();
    if (job.status !== 'active') {
      return res.status(400).json({ error: 'This job is no longer accepting applications' });
    }

    // Calculate match but don't block application based on qualifications
    // Companies can review candidates who might not be perfect fits
    const match = calculateJobMatchAndEligibility(studentData, job);

    // Handle supporting documents if provided
    let supportingDocUrls = [];
    if (req.files && Array.isArray(req.files)) {
      try {
        for (const docFile of req.files) {
          const docUrl = await uploadToCloudinary(docFile, req.user.uid, 'cv/supporting');
          supportingDocUrls.push({
            name: docFile.originalname,
            url: docUrl
          });
        }
      } catch (docError) {
        console.error('Warning: Failed to upload supporting document:', docError.message);
        // Don't block application if supporting docs fail
      }
    }

    const applicationData = {
      studentId: req.user.uid,
      jobId,
      coverLetter: coverLetter?.trim() || '',
      cvUrl: finalCvUrl,
      cvSubmissionMethod: submissionMethod, // 'file' or 'url' for tracking
      supportingDocuments: supportingDocUrls,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      qualificationMatch: match.score,
      studentInfo: {
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone
      }
    };

    const docRef = await db.collection(collections.JOB_APPLICATIONS).add(applicationData);
    
    await createNotification(req.user.uid, {
      type: 'job',
      title: 'Job Application Submitted',
      message: `Your application for ${job.title} has been submitted successfully.`,
      relatedId: docRef.id
    });

    res.status(201).json({ 
      id: docRef.id, 
      ...applicationData,
      message: 'Job application submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/job-applications', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.JOB_APPLICATIONS)
      .where('studentId', '==', req.user.uid)
      .get();
    
    const docs = snapshot.docs.sort((a, b) => {
      const dateA = new Date(a.data().appliedAt);
      const dateB = new Date(b.data().appliedAt);
      return dateB - dateA;
    });
    
    const applications = await Promise.all(docs.map(async doc => {
      const appData = doc.data();
      const jobDoc = await db.collection(collections.JOBS).doc(appData.jobId).get();
      
      let jobDetails = null;
      if (jobDoc.exists) {
        const jobData = jobDoc.data();
        const companyDoc = await db.collection(collections.USERS)
          .doc(jobData.companyId).get();
        
        jobDetails = {
          ...jobData,
          company: companyDoc.exists ? companyDoc.data().name : 'Unknown'
        };
      }
      
      return {
        id: doc.id,
        ...appData,
        job: jobDetails
      };
    }));

    res.json(applications);
  } catch (error) {
    console.error('Get job applications error:', error);
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
    console.error('Get notifications error:', error);
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

router.put('/notifications/read-all', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', req.user.uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date().toISOString()
      });
    });

    await batch.commit();

    res.json({ 
      message: 'All notifications marked as read',
      count: snapshot.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/institutions', async (req, res) => {
  try {
    console.log('📚 Student requesting institutions list...');
    
    // Get ALL institutions - no status filter needed
    const snapshot = await db.collection(collections.INSTITUTIONS).get();
    
    const institutions = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        name: data.name || 'Unnamed Institution',
        description: data.description || '',
        location: data.location || '',
        contact: data.contact || '',
        website: data.website || '',
        createdAt: data.createdAt
      };
    });
    
    console.log(`✅ Found ${institutions.length} institutions for student`);
    
    // Sort alphabetically by name
    institutions.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(institutions);
  } catch (error) {
    console.error('❌ Get institutions error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to fetch institutions'
    });
  }
});

module.exports = router;