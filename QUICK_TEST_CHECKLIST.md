# 🎯 Quick Testing Checklist (10 Minutes)

## ⚡ Super Quick Start

### Terminal 1 - Start Server
```bash
cd server
npm run dev
```
✅ Wait for: "Server running on port 5000"

### Terminal 2 - Start Client  
```bash
cd client
npm start
```
✅ Wait for: "Compiled successfully"

### Browser
```
http://localhost:3000
```

---

## 🧪 5-Minute Test

### Test 1: ✅ Register Student
```
1. Click "Register"
2. Select "Student"
3. Email: test@example.com
4. Password: Test123!
5. Click "Sign Up"
```
Expected: ✅ Logged in, see dashboard

---

### Test 2: ✅ Upload Transcript with Qualification
```
1. Click "Upload Transcript"
2. Step 1: Select any PDF file
3. Step 2: Enter graduation year (2023)
4. Step 3: ← THIS IS NEW! Select "Degree" from dropdown
5. Step 4: Click "Submit"
```
Expected: 
- ✅ See dropdown with options (High School, Certificate, Diploma, Degree, Masters, PhD)
- ✅ Upload succeeds
- ✅ Notification: "Transcript uploaded successfully"

---

### Test 3: ✅ Check Backend Logs
```
Watch server terminal for:
```

Look for: 🎓 emoji in logs
```
🎓 DETAILED Subject Check for...
📚 Student Subjects:
✋ Required Subjects:
```

---

### Test 4: ✅ Browse Courses
```
1. Click "Browse Courses" or "Institutions"
2. Select an institution
3. Click on a faculty
4. View courses list
```
Expected:
- ✅ See courses
- ✅ Courses have eligibility info
- ✅ Some courses might be hidden (not in list)

---

## 🔍 Detailed Test Results

### Console Markers to Look For

#### ✅ Good Signs (Server Console)
```
🔍 Fetching courses...
📋 Total courses found: X
🎓 Subject Check for...
✅ ELIGIBLE
📤 Returning X visible courses
```

#### ❌ Bad Signs
```
❌ Error
🚨 Cannot read property
TypeError: Cannot convert undefined
```

---

## 🧬 Backend Data Structure Test

### Check Firebase Has This Format

**Go to Firebase Console → Firestore → Documents**

#### Course Document Should Have:
```javascript
{
  name: "Business Management",
  level: "Degree",
  
  // NEW - Add these if missing:
  requiredSubjects: ["Accounting", "Economics"],
  preferredSubjects: ["Statistics"],
  isGeneralCourse: false
}
```

#### Student Document Should Have (After Upload):
```javascript
{
  name: "Test Student",
  email: "test@example.com",
  
  // NEW - Should appear after transcript upload:
  qualifications: ["Degree"],
  subjects: [
    { subject: "Mathematics", grade: "A", gradeValue: 90 },
    { subject: "Physics", grade: "B", gradeValue: 85 }
  ]
}
```

---

## 🚀 Full Test Flow (15 Minutes)

### Part 1: Setup (2 min)
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2  
cd client && npm start

# Browser
http://localhost:3000
```

---

### Part 2: Create Test Account (2 min)
```
1. Register → Student
2. Email: alex@test.com
3. Password: Test123!
4. Click "Sign Up"
```

---

### Part 3: Upload Transcript (3 min)
```
1. Dashboard → "Upload Transcript"
2. Step 1: Choose PDF (any file)
3. Step 2: Year=2023, GPA=3.8
4. Step 3: SELECT "Degree" ← KEY TEST!
5. Submit
```

✅ Check console for:
```
✅ Transcript uploaded
📚 qualificationLevel: Degree
🎓 subjects extracted
```

---

### Part 4: Test Course Filtering (4 min)

#### Option A: Add Test Course in Firebase

Go to `Firestore Console` → `COURSES` → Add document:

```javascript
{
  name: "Test Course",
  level: "Degree",
  institutionId: "[your-institution-id]",
  facultyId: "[your-faculty-id]",
  requiredSubjects: ["Mathematics"],
  preferredSubjects: [],
  isGeneralCourse: false
}
```

#### Option B: Modify Existing Course

Add to existing course in Firebase:
```javascript
requiredSubjects: ["Mathematics", "Physics"],
preferredSubjects: ["Chemistry"],
isGeneralCourse: false
```

---

### Part 5: Browse and See Filtering (4 min)

```
1. Click "Browse Institutions"
2. Select an institution
3. Browse courses
4. Look at server console for:
   🎓 Subject Check output
```

**Expected:**
- If student has "Mathematics" → Course visible ✅
- If student missing "Physics" → Course hidden ❌ (if strict)
- Or → Course visible with warning ⚠️ (if general)

---

## 📋 Test Cases Matrix

### Test 1: General Course (No Requirements)

**Setup:**
```javascript
requiredSubjects: [],
isGeneralCourse: true
```

**Expected Result:**
```
✅ VISIBLE to ALL students
Score: 100%
Message: "No specific subjects required"
```

---

### Test 2: Has Required Subjects

**Setup:**
```javascript
// Course needs Math and Physics
requiredSubjects: ["Mathematics", "Physics"],

// Student has Math, Physics, Chemistry
student.subjects: [
  {subject: "Mathematics", grade: "A"},
  {subject: "Physics", grade: "B"},
  {subject: "Chemistry", grade: "A"}
]
```

**Expected Result:**
```
✅ VISIBLE
Score: 120% (100 base + 20 bonus for Chemistry)
Message: "You have all subjects + bonus!"
```

---

### Test 3: Missing Required (Strict)

**Setup:**
```javascript
// Course needs Math and Physics (STRICT)
requiredSubjects: ["Mathematics", "Physics"],
isGeneralCourse: false,

// Student only has Math
student.subjects: [
  {subject: "Mathematics", grade: "A"}
]
```

**Expected Result:**
```
❌ HIDDEN (not visible)
Score: 0%
Reason: "Missing required subjects"
```

---

### Test 4: Missing But General

**Setup:**
```javascript
// Course needs Math and Physics (GENERAL)
requiredSubjects: ["Mathematics", "Physics"],
isGeneralCourse: true,  // ← GENERAL!

// Student only has Math
student.subjects: [
  {subject: "Mathematics", grade: "A"}
]
```

**Expected Result:**
```
✅ VISIBLE (general allows)
⚠️ WARNING: "Missing Physics but can apply"
Score: 50%
Note: Flagged for admin review
```

---

## 🐛 Quick Debugging

### "Courses not showing up?"
1. Check if courses have `requiredSubjects` array
2. Verify student has `qualifications` array
3. Look for 🎓 in server console

### "Can't upload transcript?"
1. Verify qualification dropdown appears
2. Check PDF upload path
3. Look for errors in browser console (F12)

### "Eligibility wrong?"
1. Verify subject names match (case-insensitive)
2. Check fuzzy matching: "Maths" should match "Mathematics"
3. Verify score calculation: 100 + 20(per preferred)

### "Courses hidden?"
Check this:
```javascript
isGeneralCourse: false  // Course is strict
Missing: ["Physics"]    // Student missing subjects
Result: ❌ HIDDEN       // Correct!
```

---

## ✅ Final Verification

After testing, verify:

| Item | Status |
|------|--------|
| Server starts | ✅ |
| Client starts | ✅ |
| Register works | ✅ |
| Transcript upload shows dropdown | ✅ |
| Qualification level captured | ✅ |
| Course list shows filtered results | ✅ |
| Console shows 🎓 markers | ✅ |
| Can apply to eligible course | ✅ |
| Cannot apply to ineligible | ✅ |

---

## 📞 Troubleshooting

### Server Error: "Cannot find module"
```bash
cd server
npm install
npm run dev
```

### Client Error: "Compiled with warnings"
```bash
cd client
npm install
npm start
```

### Firebase Connection Error
- Check `server/config/firebase.js` config
- Verify .env variables
- Check Firebase project is active

### Courses Not Filtered
- Add `requiredSubjects` to course in Firebase
- Add `isGeneralCourse` to course
- Restart server
- Check browser cache (F12 → Clear)

### Subject Matching Not Working
- Subject names must be in `student.subjects` array
- Course must have `requiredSubjects` array
- Check server logs for 🎓 markers
- Verify exact subject names or fuzzy match

---

## 🎬 Expected Console Output

```
🔍 Fetching courses for faculty: faculty123
📋 Total courses found: 5
✅ Found 5 ACTIVE courses

🎓 DETAILED Subject Check for "Engineering 101":
   ═══════════════════════════════════════════
   📚 Student Subjects (2):
      • mathematics (A)
      • physics (B)
   ✋ Required Subjects (2):
      • mathematics
      • physics
   💡 Preferred Subjects (0):
   ═══════════════════════════════════════════
   🔍 Required Subject Analysis:
      ✅ Mathematics (student has: mathematics)
      ✅ Physics (student has: physics)
   🎯 VERDICT: ✅ ELIGIBLE (Score: 100%)
      Reason: Has all required subjects

📤 Returning 4 visible courses (1 hidden due to eligibility)
```

---

## Time Estimates

- ⏱️ Setup: 2 minutes
- ⏱️ Register: 1 minute
- ⏱️ Upload Transcript: 2 minutes
- ⏱️ Browse Courses: 2 minutes
- ⏱️ Test Filtering: 3 minutes
- **Total: ~10 minutes**

---

**Now go test! 🚀**
