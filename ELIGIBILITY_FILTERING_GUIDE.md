# Course Eligibility Filtering System

## Overview

Students will **NEVER see courses they are not eligible for**. The system automatically hides ineligible courses at the backend level.

## How It Works

### 1. Backend Course Filtering (Automatic Hiding)

When a student requests courses from a faculty:

```
Request: GET /api/student/institutions/{institutionId}/faculties/{facultyId}/courses

Process:
├─ Fetch student profile (with subjects and transcript)
├─ Fetch all ACTIVE courses for the faculty
├─ For each course:
│  ├─ Check eligibility against course requirements
│  ├─ Set course.visible based on eligibility
│  └─ Return course with eligibility metadata
└─ Filter: Return ONLY visible courses
   └─ Students never receive data for ineligible courses
```

**Backend Code Reference**: `server/routes/student.js` line 532
```javascript
const visibleCourses = courses.filter(course => course.visible);
const hiddenCount = courses.length - visibleCourses.length;

console.log(`📤 Returning ${visibleCourses.length} visible courses to student (${hiddenCount} hidden due to eligibility)`);
res.json(visibleCourses);
```

### 2. Eligibility Checking Methods

Two eligibility systems work together:

#### A. **New Subject-Based Requirements** (CourseRequirement Model)
For courses with specific subject requirements:

```javascript
// File: server/utils/eligibilityChecker.js
// Function: checkCourseEligibility(studentTranscript, courseRequirements)

Checks:
├─ Overall percentage vs minimum required
├─ Required subjects (fuzzy matching):
│  ├─ Checks if student has each required subject
│  └─ Verifies marks meet minimum for each subject
├─ Minimum number of required subjects met
└─ Bonus: Optional additional subjects
```

**Supported Subject Name Formats**:
- Exact matches: "Mathematics" = "Mathematics"
- Partial matches: "Math" matches "Mathematics"
- Word-based matches: "Maths" matches "Mathematics"

#### B. **Legacy Qualification-Based System** (For backward compatibility)
For courses without CourseRequirement set:

```javascript
// File: server/routes/student.js
// Function: checkCourseEligibility(student, course)

Checks:
├─ Qualification level hierarchy
│  ├─ High School (0)
│  ├─ Certificate (1)
│  ├─ Diploma (2)
│  ├─ Degree (3)
│  ├─ Masters (4)
│  └─ PhD (5)
├─ Student's highest qualification >= course required level
└─ Subject prerequisites (if specified in course)
```

### 3. Course Visibility Rules

A course is **VISIBLE** (shown to student) only if:

```
✅ Course status is 'active' (or undefined)
✅ AND student is eligible based on:
   • New model: CourseRequirement fields match student transcript
   • Legacy model: Qualification level + subject prerequisites met
   • OR: Course has no requirements (general course)
```

A course is **HIDDEN** (filtered out) if:

```
❌ Student lacks required subjects
❌ Student's marks are below minimum in required subjects
❌ Student's overall percentage is insufficient
❌ Student's qualification level is too low
❌ Course has status: 'inactive' or 'archived'
```

### 4. Frontend Display

The StudentDashboard component receives only eligible courses:

```jsx
// File: client/src/pages/StudentDashboard.jsx

When user clicks "View Courses":
├─ Calls API: studentAPI.getFacultyCourses(institutionId, facultyId)
├─ Receives only visible/eligible courses
├─ Displays courses with eligibility badges:
│  ├─ ✅ Green: "You qualify for this course"
│  └─ ⚠️  Red: Would show if ineligible (but never shown!)
└─ Apply button ONLY enabled for eligible courses
```

**Example Course Card Rendering**:
```jsx
{course.eligible ? (
  <div className="eligibility-success">
    <FaCheckCircle /> You qualify for this course
  </div>
) : (
  // This code never executes because ineligible courses are filtered out
  <div className="eligibility-warning">NOT ELIGIBLE</div>
)}
```

## Setup Instructions

### For Institutions Setting Course Requirements

#### 1. Create Course Without Requirements (General Course)
```javascript
// POST /api/institution/courses
{
  "name": "Introduction to Business",
  "facultyId": "faculty123",
  "level": "Diploma",
  "isGeneralCourse": true,  // ← No specific requirements
  // No requiredSubjects field
}
// Result: ALL students can see and apply for this course
```

#### 2. Create Course With Subject Requirements
```javascript
// POST /api/course-requirements/courseId123
{
  "requiredSubjects": [
    { "subjectName": "Mathematics", "minimumMark": 70 },
    { "subjectName": "Physics", "minimumMark": 65 }
  ],
  "additionalSubjects": [
    { "subjectName": "Chemistry", "preferredMinimumMark": 60 }
  ],
  "minimumOverallPercentage": 75,
  "minimumRequiredSubjectsNeeded": 2
}
```

### Student Eligibility Check Example

**Student Transcript**:
```javascript
{
  "overallPercentage": 78,
  "subjects": [
    { "subjectName": "Mathematics", "mark": 85 },
    { "subjectName": "Physics", "mark": 72 },
    { "subjectName": "Chemistry", "mark": 68 }
  ]
}
```

**Course Requirements** (from example above):

| Check | Student | Required | Result |
|-------|---------|----------|--------|
| Overall % | 78% | 75% | ✅ PASS |
| Mathematics | 85% | 70% | ✅ PASS |
| Physics | 72% | 65% | ✅ PASS |
| Chemistry | 68% | 60% (bonus) | ✅ BONUS |
| Min Required | 2 subjects | 2 subjects | ✅ PASS |

**Result**: Course is VISIBLE to student ✅

---

**Another Student Transcript**:
```javascript
{
  "overallPercentage": 68,  // Below 75%
  "subjects": [
    { "subjectName": "Mathematics", "mark": 72 },
    { "subjectName": "Economics", "mark": 80 }  // No Physics!
  ]
}
```

**Result**: Course is HIDDEN from student ❌
- Reason: Overall % too low (68% < 75%)
- Reason: Missing required Physics

## API Endpoints

### Check Student Eligibility (Manual Check)
```
POST /api/course-requirements/{courseId}/check-eligibility

Request Body:
{
  "studentTranscript": {
    "overallPercentage": 78,
    "subjects": [
      { "subjectName": "Mathematics", "mark": 85 },
      { "subjectName": "Physics", "mark": 72 }
    ]
  }
}

Response:
{
  "isEligible": true,
  "matchPercentage": 100,
  "missingSubjects": [],
  "insufficientMarks": [],
  "reasons": [
    "✓ All required subjects present with sufficient marks",
    "✓ Overall percentage meets requirement",
    "✓ You qualify for this course!"
  ],
  "qualificationDetails": {
    "overallPercentageCheck": true,
    "requiredSubjectsCheck": true,
    "additionalSubjectsMatched": 1
  }
}
```

### Create Course Requirements
```
POST /api/course-requirements/{courseId}

Request Body:
{
  "requiredSubjects": [...],
  "additionalSubjects": [...],
  "minimumOverallPercentage": 75,
  "minimumRequiredSubjectsNeeded": 2
}
```

### Get Course Requirements
```
GET /api/course-requirements/{courseId}
```

### Update Course Requirements
```
PUT /api/course-requirements/{courseId}
```

### Delete Course Requirements
```
DELETE /api/course-requirements/{courseId}
```

### Get All Requirements for Institution
```
GET /api/course-requirements/institution/{institutionId}
```

## Logging & Debugging

The system logs detailed eligibility checks. To see them:

```javascript
// Terminal where server is running shows:

📋 Total courses found for this faculty: 12
✅ Found 8 ACTIVE courses for faculty
  ✓ Course: Introduction to Business (ID: course123), Eligible: true, Visible: true
  ✗ Course: Advanced Mathematics (ID: course456), Eligible: false, Visible: false
  ✓ Course: Introduction to Physics (ID: course789), Eligible: true, Visible: true
📤 Returning 7 visible courses to student (5 hidden due to eligibility)
```

## Key Implementation Files

| File | Purpose |
|------|---------|
| `server/models/CourseRequirement.js` | Database schema for subject requirements |
| `server/utils/eligibilityChecker.js` | New eligibility checking logic |
| `server/routes/courseRequirements.js` | API endpoints for managing requirements |
| `server/routes/student.js` | Student course fetching with automatic filtering |
| `client/src/pages/StudentDashboard.jsx` | Frontend course display (only receives visible courses) |
| `server/server.js` | Routes registration |

## Summary

✅ **Students are protected from seeing ineligible courses**
- Ineligible courses are filtered out at the backend before sending to frontend
- No JavaScript workarounds or hacks can show hidden courses
- API only returns visible courses

✅ **Flexible eligibility matching**
- Subject-based with fuzzy matching (handles "Math" vs "Mathematics")
- Support for optional additional subjects
- Overall percentage thresholds
- Minimum required subjects count

✅ **Backward compatible**
- Legacy qualification-based system still works
- New CourseRequirement model gradually replaces it
- Both systems coexist without conflicts
