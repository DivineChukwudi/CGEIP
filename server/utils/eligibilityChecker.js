/**
 * Check if a student qualifies for a course based on subject and percentage matching
 * Designed to work with CourseRequirement model
 */
async function checkCourseEligibility(studentTranscript, courseRequirements) {
  const eligibilityResult = {
    isEligible: true,
    matchPercentage: 0,
    missingSubjects: [],
    insufficientMarks: [],
    reasons: [],
    qualificationDetails: {
      overallPercentageCheck: false,
      requiredSubjectsCheck: false,
      additionalSubjectsMatched: 0
    }
  };

  // Handle case where no requirements are set (general course)
  if (!courseRequirements || !courseRequirements.requiredSubjects || courseRequirements.requiredSubjects.length === 0) {
    eligibilityResult.reasons = ['No specific requirements - this is a general course. Everyone can apply!'];
    return eligibilityResult;
  }

  // Check 1: Overall percentage
  if (studentTranscript.overallPercentage !== undefined) {
    const requiredPercentage = courseRequirements.minimumOverallPercentage || 0;
    if (studentTranscript.overallPercentage < requiredPercentage) {
      eligibilityResult.isEligible = false;
      eligibilityResult.reasons.push(
        `Overall percentage ${studentTranscript.overallPercentage}% is below required ${requiredPercentage}%`
      );
    } else {
      eligibilityResult.qualificationDetails.overallPercentageCheck = true;
    }
  }

  // Create a map of student's subjects with their marks for fuzzy matching
  const studentSubjectsMap = {};
  if (studentTranscript.subjects && Array.isArray(studentTranscript.subjects)) {
    studentTranscript.subjects.forEach(subject => {
      // Support both {subjectName, mark} and {subject, mark} formats
      const name = (subject.subjectName || subject.subject || '').toLowerCase().trim();
      const mark = subject.mark || subject.percentage || 0;
      const grade = subject.grade || null;
      
      if (name) {
        studentSubjectsMap[name] = { mark, grade };
      }
    });
  }

  // Fuzzy subject matching function
  const findSubjectMatch = (requiredSubject) => {
    const required = requiredSubject.toLowerCase().trim();
    
    // Exact match first
    if (studentSubjectsMap[required]) {
      return studentSubjectsMap[required];
    }
    
    // Try partial word matches
    const requiredWords = required.split(/[\s\-_]/);
    for (const [studentSubject, marks] of Object.entries(studentSubjectsMap)) {
      const studentWords = studentSubject.split(/[\s\-_]/);
      
      // Check if any word matches (e.g., "Maths" matches "Mathematics")
      const anyMatch = requiredWords.some(reqWord => 
        studentWords.some(studWord => 
          studWord.includes(reqWord) || reqWord.includes(studWord)
        )
      );
      
      if (anyMatch) {
        return marks;
      }
    }
    
    return null;
  };

  // Check 2: Required subjects
  let requiredSubjectsMatched = 0;
  
  courseRequirements.requiredSubjects.forEach(requiredSubject => {
    const subjectName = requiredSubject.subjectName || requiredSubject;
    const minimumMark = requiredSubject.minimumMark || 0;
    const studentMarks = findSubjectMatch(subjectName);

    if (!studentMarks) {
      // Student doesn't have this required subject
      eligibilityResult.isEligible = false;
      eligibilityResult.missingSubjects.push(subjectName);
      eligibilityResult.reasons.push(
        `Missing required subject: ${subjectName}`
      );
    } else if (studentMarks.mark < minimumMark) {
      // Student has subject but mark is too low
      eligibilityResult.isEligible = false;
      eligibilityResult.insufficientMarks.push({
        subject: subjectName,
        studentMark: studentMarks.mark,
        requiredMark: minimumMark
      });
      eligibilityResult.reasons.push(
        `${subjectName}: Your mark (${studentMarks.mark}%) is below required (${minimumMark}%)`
      );
    } else {
      requiredSubjectsMatched++;
    }
  });

  // Check if minimum number of required subjects are met
  const minimumRequired = courseRequirements.minimumRequiredSubjectsNeeded || courseRequirements.requiredSubjects.length;
  if (requiredSubjectsMatched >= minimumRequired) {
    eligibilityResult.qualificationDetails.requiredSubjectsCheck = true;
  } else {
    eligibilityResult.isEligible = false;
    eligibilityResult.reasons.push(
      `Met only ${requiredSubjectsMatched} of ${minimumRequired} required subjects`
    );
  }

  // Check 3: Additional/Optional subjects (bonus)
  if (courseRequirements.additionalSubjects && courseRequirements.additionalSubjects.length > 0) {
    courseRequirements.additionalSubjects.forEach(additionalSubject => {
      const subjectName = additionalSubject.subjectName || additionalSubject;
      const preferredMark = additionalSubject.preferredMinimumMark || 0;
      const studentMarks = findSubjectMatch(subjectName);
      
      if (studentMarks && studentMarks.mark >= preferredMark) {
        eligibilityResult.qualificationDetails.additionalSubjectsMatched++;
      }
    });
  }

  // Calculate match percentage (0-100)
  const totalChecks = 2; // overall percentage + required subjects
  const passedChecks = 
    (eligibilityResult.qualificationDetails.overallPercentageCheck ? 1 : 0) +
    (eligibilityResult.qualificationDetails.requiredSubjectsCheck ? 1 : 0);
  
  eligibilityResult.matchPercentage = Math.round((passedChecks / totalChecks) * 100);

  // Generate summary message
  if (eligibilityResult.isEligible) {
    eligibilityResult.reasons = [
      `✓ All required subjects present with sufficient marks`,
      `✓ Overall percentage meets requirement`,
      `✓ You qualify for this course!`
    ];
    if (eligibilityResult.qualificationDetails.additionalSubjectsMatched > 0) {
      eligibilityResult.reasons.push(
        `✓ Bonus: ${eligibilityResult.qualificationDetails.additionalSubjectsMatched} additional subject(s) matched`
      );
    }
  }

  return eligibilityResult;
}

module.exports = { checkCourseEligibility };
