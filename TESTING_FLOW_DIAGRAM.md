# 🧪 Testing Flow Diagram

## The Complete Testing Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    🚀 TESTING SUBJECT PREREQUISITE SYSTEM        │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: STARTUP (2 minutes)
═════════════════════════════════════════════════════════════════

  Terminal 1                    Terminal 2                Browser
  ─────────────                ─────────────              ───────
     │                            │                         │
     │ cd server                  │                         │
     │ npm run dev                │                         │
     │                            │                         │
     ├─ [LOADING]                │                         │
     │                            │                         │
     ├─ ✅ Server ready          │                         │
     │  Port 5000                 │                         │
     │                            │                         │
     │                            │ cd client              │
     │                            │ npm start              │
     │                            │                         │
     │                            ├─ [LOADING]             │
     │                            │                         │
     │                            ├─ ✅ Compiled          │
     │                            │  Port 3000             │
     │                            │                        │
     │                            │                        ├─ Open
     │                            │                        │ localhost:3000
     │                            │                        │
     │                            │                        ├─ ✅ See UI
     │                            │                        │  Home page


PHASE 2: REGISTER STUDENT (2 minutes)
═════════════════════════════════════════════════════════════════

  Browser                        Server Console
  ───────                        ──────────────
     │                              │
     ├─ Click "Register"            │
     │                              │
     ├─ Select "Student"            │
     │                              │
     ├─ Email: test@example.com    │
     ├─ Password: Test123!         │
     │                              │
     ├─ Click "Sign Up"             │
     │                              │
     ├─ Sends form                  ├─ POST /auth/register
     │                              │
     │                              ├─ ✅ User created
     │                              │  Email verified
     │                              │
     ├─ ✅ Redirected to Dashboard  │
     │  Student logged in           │


PHASE 3: UPLOAD TRANSCRIPT WITH QUALIFICATION (3 minutes)
═════════════════════════════════════════════════════════════════

  Browser                        Server Console
  ───────                        ──────────────
     │                              │
     ├─ Click "Upload Transcript"   │
     │                              │
     ├─ Step 1: Choose PDF          │
     │  └─ Select file              │
     │                              │
     ├─ Step 2: Enter Details       │
     │  └─ Year: 2023               │
     │  └─ GPA: 3.8                 │
     │                              │
     ├─ Step 3: ← THIS IS NEW!      │
     │  ┌──────────────────────┐    │
     │  │ QUALIFICATION LEVEL ▼│    │
     │  │                      │    │
     │  │ High School          │    │ ← Dropdown shows!
     │  │ Certificate          │    │   6 options
     │  │ Diploma              │    │
     │  │ Degree     ← SELECT  │    │
     │  │ Masters              │    │
     │  │ PhD                  │    │
     │  └──────────────────────┘    │
     │                              │
     ├─ Step 4: Review & Submit     │
     │  └─ Click "Submit"           │
     │                              │
     ├─ Sends data                  ├─ POST /student/transcripts
     │                              │
     │                              ├─ ✅ Parsing PDF
     │                              ├─ 📚 Extracting subjects
     │                              ├─ 🎓 Storing qualificationLevel
     │                              │  qualificationLevel: "Degree"
     │                              │
     │                              ├─ ✅ Storing in DB:
     │                              │  TRANSCRIPTS:
     │                              │  ├─ qualificationLevel: "Degree"
     │                              │  └─ subjects: [...]
     │                              │
     │                              │  USERS:
     │                              │  ├─ qualifications: ["Degree"]
     │                              │  └─ subjects: [...]
     │                              │
     ├─ ✅ "Transcript uploaded"    │
     │  Notification appears        │


PHASE 4: BROWSE COURSES (2 minutes)
═════════════════════════════════════════════════════════════════

  Browser                        Server Console
  ───────                        ──────────────
     │                              │
     ├─ Click "Browse Courses"      │
     │  or "Browse Institutions"    │
     │                              │
     ├─ Select Institution          │
     │                              │
     ├─ Select Faculty              │
     │                              │
     ├─ Loads courses               ├─ GET /student/institutions/.../courses
     │                              │
     │                              ├─ 🔍 Fetching all courses: 12 found
     │                              │
     │                              ├─ FOR EACH COURSE:
     │                              │  ├─ 🎓 Subject Check
     │                              │  │
     │                              │  ├─ 📚 Student Subjects:
     │                              │  │  • Mathematics
     │                              │  │  • Physics
     │                              │  │  • Chemistry
     │                              │  │
     │                              │  ├─ ✋ Required Subjects:
     │                              │  │  • Mathematics
     │                              │  │  • Physics
     │                              │  │
     │                              │  ├─ 💡 Preferred Subjects:
     │                              │  │  • Chemistry
     │                              │  │
     │                              │  ├─ 🔍 Matching:
     │                              │  │  ✅ Math → Math ✓
     │                              │  │  ✅ Physics → Physics ✓
     │                              │  │  ✅ Chemistry → bonus! ✓
     │                              │  │
     │                              │  └─ 🎯 Result: ELIGIBLE
     │                              │     Score: 120% (100 + 20)
     │                              │     Visible: true
     │                              │
     │                              ├─ FILTERING:
     │                              │  ✅ Course 1: visible: true
     │                              │  ✅ Course 2: visible: true
     │                              │  ✅ Course 3: visible: true
     │                              │  ❌ Course 4: visible: false
     │                              │  ❌ Course 5: visible: false
     │                              │
     │                              ├─ 📤 Sending to client:
     │                              │  Only visible courses
     │                              │
     ├─ Receives courses            │  📤 Returning 8 visible
     │                              │     (4 hidden due to eligibility)
     │
     ├─ ✅ Displays course list
     │  ├─ "Engineering 101"
     │  ├─ "Business Management"
     │  ├─ "Life Skills"
     │  └─ (Other eligible courses)
     │
     └─ ❌ HIDDEN courses NOT shown
        • "Advanced Chemistry"
        • "Specialized Physics"
        (Students don't see these)


PHASE 5: TEST COURSE APPLICATION (2 minutes)
═════════════════════════════════════════════════════════════════

  Browser                        Server Console
  ───────                        ──────────────
     │                              │
     ├─ Click "Apply" on course     │
     │                              │
     ├─ Sends application           ├─ POST /student/applications
     │                              │
     │                              ├─ Fetching student data
     │                              ├─ Fetching course data
     │                              │
     │                              ├─ DOUBLE-CHECK Eligibility:
     │                              │  ├─ Qualification: Degree >= Degree? ✓
     │                              │  ├─ Subjects match? ✓
     │                              │  └─ Score: 120% ✓
     │                              │
     │                              ├─ ✅ ALL CHECKS PASSED
     │                              │
     ├─ ✅ Application created      ├─ Saving application
     │  Success notification        │
     │                              ├─ Creating notification
     │                              │
     │                              ├─ ✅ Application stored
     │                              │  Status: Pending
     │
     ├─ See in "My Applications"
     │  Status: Pending
     │  Course: "Business Management"
     │  Applied: Today


PHASE 6: TEST SECURITY (1 minute) - OPTIONAL
═════════════════════════════════════════════════════════════════

  Browser (F12 Console)         Server Console
  ─────────────────────         ──────────────
     │                              │
     ├─ Open F12 (Developer Tools)  │
     │                              │
     ├─ Go to Console tab           │
     │                              │
     ├─ Try to apply to             ├─ POST /student/applications
     │  INELIGIBLE course:          │
     │                              ├─ Check eligibility
     │  fetch('/student/            │ ✅ Eligible: false
     │   applications', ...)        │
     │                              ├─ ❌ REJECTED
     │                              │
     ├─ See error:                  ├─ Response 403:
     │  403 Forbidden               │ "You do not meet the
     │  "You do not meet            │  qualification requirements"
     │   requirements"              │
     │                              │
     └─ ✅ Security works!


EXPECTED CONSOLE OUTPUT
═════════════════════════════════════════════════════════════════

When browsing courses, look for this in server terminal:

✅ START
   🔍 Fetching courses for faculty: fac456
   📋 Total courses found: 12
   ✅ Found 12 ACTIVE courses

✅ CHECKING EACH COURSE
   🎓 DETAILED Subject Check for "Engineering 101":
      ═══════════════════════════════════════════════════════════
      📚 Student Subjects (3):
         • mathematics (A)
         • physics (B)
         • chemistry (A)
      ✋ Required Subjects (2):
         • mathematics
         • physics
      💡 Preferred Subjects (1):
         • chemistry
      ═══════════════════════════════════════════════════════════
      🔍 Required Subject Analysis:
         ✅ Mathematics (student has: mathematics)
         ✅ Physics (student has: physics)
      💫 Preferred Subject Analysis (Bonus):
         ✅ Chemistry (+20 bonus points)
      🎯 VERDICT: ✅ ELIGIBLE (Score: 120%)
         Reason: Has all required subjects, +20 bonus for preferred subjects

   ✓ Course: Engineering 101 (ID: course1), Eligible: true, Visible: true

✅ FILTERING
   📤 Returning 8 visible courses to student (4 hidden due to eligibility)


SUCCESS CRITERIA CHECKLIST
═════════════════════════════════════════════════════════════════

After testing, you should see ALL of these ✅:

 ✅ Qualification dropdown appears (Step 3 of upload)
 ✅ Can select from 6 options (HS, Cert, Diploma, Degree, Masters, PhD)
 ✅ Selection saved in database
 ✅ 🎓 markers appear in server console
 ✅ Subject extraction works
 ✅ Courses are filtered (some hidden)
 ✅ Eligible courses visible
 ✅ Ineligible courses hidden
 ✅ Fuzzy matching works ("Maths" = "Mathematics")
 ✅ Bonus scoring works (+20 per preferred)
 ✅ Can apply to eligible course (success)
 ✅ Cannot apply to ineligible (403 error)
 ✅ Eligibility score calculated correctly
 ✅ No errors in console (F12)
 ✅ No errors in server terminal

If ALL ✅ → EVERYTHING WORKS! 🎉


TIMING BREAKDOWN
═════════════════════════════════════════════════════════════════

Activity                              Time
─────────────────────────────────────────────
1. Startup (server + client)         2 min
2. Register student                  1 min
3. Upload transcript with dropdown   3 min
4. Browse and filter courses         2 min
5. Test application                  2 min
6. Security test (optional)          1 min
                                    ─────────
TOTAL                               ~10 min

If you do all tests: ~15 minutes total


QUICK VISUAL INDICATORS
═════════════════════════════════════════════════════════════════

Look for these in the UI:

Dropdown (Step 3):
┌──────────────────────┐
│ Qualification Level ▼│
│ - High School        │
│ - Certificate        │
│ - Diploma            │
│ - Degree      ← Selected
│ - Masters            │
│ - PhD                │
└──────────────────────┘

Course List:
✅ Visible Courses:
   • Engineering 101
   • Business Management
   • Life Skills

❌ Hidden Courses:
   (Not shown at all)

Server Console:
🎓 DETAILED Subject Check...
📚 Student Subjects...
🎯 VERDICT: ✅ ELIGIBLE


NOW TEST IT! 🚀
═════════════════════════════════════════════════════════════════
```

## Summary

**Testing is straightforward:**

1. ✅ **Start** server and client (2 min)
2. ✅ **Register** student (1 min)
3. ✅ **Upload transcript** - **See qualification dropdown** (3 min)
4. ✅ **Browse courses** - **See filtered list** (2 min)
5. ✅ **Watch console** - **See 🎓 markers** (continuous)
6. ✅ **Apply** - **Test success/failure** (2 min)

**Total time: ~10 minutes**

**Watch for: 🎓 emoji in server console**
