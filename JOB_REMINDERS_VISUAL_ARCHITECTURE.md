# 🎯 Job Preferences Reminder - Visual Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CGIEP Application                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Student Dashboard                        │  │
│  │                                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │ job-interests tab                                   │   │  │
│  │  │ ┌──────────────────────────────────────────────┐    │   │  │
│  │  │ │  📬 Badge (3) - Notifications              │    │   │  │
│  │  │ │                                              │    │   │  │
│  │  │ │  • ⚙️ Complete Your Job Preferences       │    │   │  │
│  │  │ │  • 💼 Python Developer at TechCo         │    │   │  │
│  │  │ │  • 🎯 Senior React Engineer at StartUp   │    │   │  │
│  │  │ └──────────────────────────────────────────────┘    │   │  │
│  │  │ ┌──────────────────────────────────────────────┐    │   │  │
│  │  │ │ Job Preferences Form                         │    │   │  │
│  │  │ │ ☐ Industries, Job Types, Skills            │    │   │  │
│  │  │ │ ☐ Work Type, Location, Salary              │    │   │  │
│  │  │ │ [Save Preferences]                          │    │   │  │
│  │  │ └──────────────────────────────────────────────┘    │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  useTabNotifications Hook                                    │  │
│  │  • Polls /api/notifications/tab-counts every 15s            │  │
│  │  • Shows badge with reminder count                          │  │
│  │  • Calls /api/notifications/clear-tab on open               │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Backend Server                             │  │
│  │                                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  JobPreferencesReminder Service                    │   │  │
│  │  │  (runs every 3 hours)                              │   │  │
│  │  │                                                     │   │  │
│  │  │  1. Query students > 24 hours old                  │   │  │
│  │  │  2. Check for empty job_preferences               │   │  │
│  │  │  3. Send reminder if incomplete                    │   │  │
│  │  │  4. Track last reminder time                       │   │  │
│  │  │  5. Log results                                    │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                            ↓                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  API Endpoints                                     │   │  │
│  │  │                                                    │   │  │
│  │  │  PUT /api/student/job-preferences                 │   │  │
│  │  │  • Save preferences                               │   │  │
│  │  │  • DELETE old reminders                           │   │  │
│  │  │                                                    │   │  │
│  │  │  GET /api/notifications/tab-counts                │   │  │
│  │  │  • Count job_match notifications                  │   │  │
│  │  │  • Count job_preference_reminder notifications    │   │  │
│  │  │  • Return max for badge                           │   │  │
│  │  │                                                    │   │  │
│  │  │  POST /api/notifications/clear-tab                │   │  │
│  │  │  • Mark job_match as read                         │   │  │
│  │  │  • Mark job_preference_reminder as read           │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                            ↓                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  Firebase Firestore                               │   │  │
│  │  │                                                    │   │  │
│  │  │  collections:                                     │   │  │
│  │  │  ├── users                                        │   │  │
│  │  │  │   └── {studentId}                              │   │  │
│  │  │  │       ├── role: "student"                      │   │  │
│  │  │  │       └── createdAt: timestamp                 │   │  │
│  │  │  │                                                │   │  │
│  │  │  ├── job_preferences                              │   │  │
│  │  │  │   └── {studentId}                              │   │  │
│  │  │  │       ├── industries: []                       │   │  │
│  │  │  │       ├── jobTypes: []                         │   │  │
│  │  │  │       ├── skills: []                           │   │  │
│  │  │  │       └── updatedAt: timestamp                 │   │  │
│  │  │  │                                                │   │  │
│  │  │  └── notifications                                │   │  │
│  │  │      ├── {notifId1}                               │   │  │
│  │  │      │   ├── type: "job_preference_reminder"      │   │  │
│  │  │      │   ├── userId: "{studentId}"               │   │  │
│  │  │      │   ├── read: false                          │   │  │
│  │  │      │   └── createdAt: timestamp                 │   │  │
│  │  │      │                                            │   │  │
│  │  │      └── {notifId2}                               │   │  │
│  │  │          ├── type: "job_match"                    │   │  │
│  │  │          ├── userId: "{studentId}"               │   │  │
│  │  │          └── read: false                          │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### 1. Initial Check (Every 3 Hours)

```
╔════════════════════════════════════════════════════════════════════╗
║                 JobPreferencesReminder Service                     ║
║                    3-Hour Interval Check                           ║
╚════════════════════════════════════════════════════════════════════╝

START
  │
  ├─ Query Users
  │  WHERE role = 'student'
  │  AND createdAt <= 24 hours ago
  │
  ├─ For Each Student:
  │  │
  │  ├─ Check job_preferences Document
  │  │  ├─ EXISTS? 
  │  │  │  └─ NO → Mark as "needs reminder"
  │  │  │
  │  │  └─ EXISTS?
  │  │     ├─ YES, but empty (industries[], jobTypes[], etc.)
  │  │     │  └─ Mark as "needs reminder"
  │  │     │
  │  │     └─ YES, and has values
  │  │        └─ Skip (already has preferences)
  │  │
  │  └─ If "needs reminder":
  │     ├─ Check: Has reminder been sent in last 3 hours?
  │     │  ├─ YES → Skip (prevent spam)
  │     │  └─ NO → Send reminder
  │     │
  │     ├─ Create Notification
  │     │  ├── type: "job_preference_reminder"
  │     │  ├── userId: "{studentId}"
  │     │  ├── title: "⚙️ Complete Your Job Preferences"
  │     │  ├── read: false
  │     │  └── createdAt: now()
  │     │
  │     └─ Track Reminder Time
  │        └── lastReminders[studentId] = now()
  │
  └─ Log Results & Schedule Next Check

```

### 2. Student Saves Preferences

```
STUDENT INTERACTION
  │
  ├─ Opens Job Interests Tab
  │  │
  │  └─ useTabNotifications.js
  │     └─ POST /api/notifications/clear-tab
  │        └─ Marks reminders as read
  │
  ├─ Fills Job Preferences Form
  │  ├─ Industries: ["Technology", "Finance"]
  │  ├─ Job Types: ["Full-time", "Internship"]
  │  ├─ Skills: ["Python", "React"]
  │  ├─ Work Type: ["remote"]
  │  └─ Location: "USA"
  │
  ├─ Clicks "Save Preferences"
  │  │
  │  └─ PUT /api/student/job-preferences
  │     │
  │     ├─ STEP 1: Save Preferences
  │     │  └─ db.collection('job_preferences').doc(uid).set(data)
  │     │
  │     ├─ STEP 2: Delete Old Reminders
  │     │  └─ db.collection('notifications')
  │     │     .where('userId', '==', uid)
  │     │     .where('type', '==', 'job_preference_reminder')
  │     │     .delete()
  │     │
  │     └─ Response: "Job preferences saved successfully"
  │
  └─ Badge disappears from job-interests tab
     (no more reminders to show)

```

### 3. Notification Clearing

```
WHEN STUDENT OPENS JOB-INTERESTS TAB

useTabNotifications Hook
  │
  ├─ Detects tab = "job-interests"
  │
  ├─ Calls POST /api/notifications/clear-tab
  │  └─ { "tab": "job-interests" }
  │
  └─ Backend Processes Clear Request
     │
     ├─ Tab to Type Mapping:
     │  └─ "job-interests" → ["job_match", "job_preference_reminder"]
     │
     ├─ For Each Type:
     │  │
     │  ├─ Query Type 1: job_match
     │  │  WHERE userId = uid AND type = "job_match" AND read = false
     │  │  → Mark all as read
     │  │
     │  └─ Query Type 2: job_preference_reminder
     │     WHERE userId = uid AND type = "job_preference_reminder" AND read = false
     │     → Mark all as read
     │
     └─ Response: { success: true, cleared: 3, types: [...] }

```

## Timeline Diagram

```
TIME                                 SERVICE STATE
────────────────────────────────────────────────────────

T0:00   ┌─ Server Starts
        │  • Firebase Initialized
        │  • JobMatcher Started (10-min interval)
        │  • JobPreferencesReminder Started (3-hour interval)
        │  • Status: RUNNING ✓
        │
T3:00   │  ┌─ REMINDER CHECK #1 ────────────────────────
        │  │  • Query 250 students
        │  │  • 5 students have no preferences
        │  │  • Send 5 reminders
        │  │  • Schedule next check in 3 hours
        │  │  
T3:15   │  │  Student Jane Opens Dashboard
        │  │  • Sees notification badge on job-interests
        │  │  • Opens job-interests tab
        │  │  • POST /clear-tab → Marks as read
        │  │  • Notification badge disappears
        │  │
T3:30   │  │  Student Jane Fills Preferences
        │  │  • Enters industries, job types, skills
        │  │  • Clicks "Save Preferences"
        │  │  • PUT /job-preferences → Saves & deletes reminders
        │  │  • No more notifications
        │  │
T6:00   │  │  ┌─ REMINDER CHECK #2 ──────────────────────
        │  │  │  • Query 250 students
        │  │  │  • 4 students still without preferences
        │  │  │     (Jane now has, so skipped)
        │  │  │  • Send 4 reminders
        │  │  │  • Schedule next check in 3 hours
        │  │  │
T9:00   │  │  │  ┌─ REMINDER CHECK #3 ───────────────────
        │  │  │  │  ...continues every 3 hours...
        │  │  │  │
...     │  │  │  │
        │
```

## State Machine Diagram

```
                    ┌─────────────────────┐
                    │  SERVICE: STOPPED   │
                    └──────────┬──────────┘
                               │ .start()
                               │
                               ▼
    ┌──────────────────────────────────────────────────┐
    │           SERVICE: RUNNING                       │
    │                                                  │
    │    ┌──────────────────────────────────────┐     │
    │    │  Every 3 Hours                       │     │
    │    │                                      │     │
    │    │  1. checkAndSendReminders()         │     │
    │    │  2. Query students                  │     │
    │    │  3. Check preferences               │     │
    │    │  4. Send reminders                  │     │
    │    │  5. Log results                     │     │
    │    │  6. Schedule next check             │     │
    │    │                                      │     │
    │    └──────────────────────────────────────┘     │
    │                   ↓                              │
    │    ┌──────────────────────────────────────┐     │
    │    │  Notification Created                │     │
    │    │                                      │     │
    │    │  Job Preferences Not Found/Empty    │     │
    │    │     ↓ Create reminder                │     │
    │    │  type: "job_preference_reminder"    │     │
    │    │  read: false                         │     │
    │    │                                      │     │
    │    └──────────────────────────────────────┘     │
    │                   ↓                              │
    │    ┌──────────────────────────────────────┐     │
    │    │  Student Action 1:                   │     │
    │    │  Opens Tab & Clears Notification    │     │
    │    │                                      │     │
    │    │  read: false → read: true            │     │
    │    │  (but notification still exists)     │     │
    │    │                                      │     │
    │    └──────────────────────────────────────┘     │
    │                   ↓                              │
    │    ┌──────────────────────────────────────┐     │
    │    │  Student Action 2:                   │     │
    │    │  Saves Job Preferences               │     │
    │    │                                      │     │
    │    │  Preferences saved ✓                │     │
    │    │  Old reminders deleted ✓            │     │
    │    │  (notification removed from DB)      │     │
    │    │                                      │     │
    │    └──────────────────────────────────────┘     │
    │                                                  │
    │    ┌──────────────────────────────────────┐     │
    │    │  Next 3-Hour Check                   │     │
    │    │                                      │     │
    │    │  Student has preferences now        │     │
    │    │  → Skip (no reminder needed)         │     │
    │    │                                      │     │
    │    └──────────────────────────────────────┘     │
    │                                                  │
    └──────────────────────────────────────────────────┘
                      │ .stop()
                      │
                      ▼
                ┌──────────────────┐
                │  SERVICE: STOPPED │
                └───────────────────┘
```

## Component Interaction Diagram

```
Frontend Layer
═════════════════════════════════════════════════════════════════════

    StudentDashboard Component
    ├─ job-interests Tab (shows badge)
    │  └─ TabNotifications Hook
    │     ├─ Polls every 15 seconds → GET /tab-counts
    │     ├─ Shows badge count
    │     └─ POST /clear-tab on tab open
    │
    └─ Job Preferences Form
       └─ PUT /job-preferences on save
          └─ Triggers cleanup


Backend Layer
═════════════════════════════════════════════════════════════════════

    JobPreferencesReminder Service
    ├─ Interval: 3 hours
    ├─ checkAndSendReminders()
    │  ├─ Query users collection
    │  ├─ Check job_preferences collection
    │  └─ Create notifications
    │
    └─ sendPreferenceReminder()
       └─ Write to notifications collection


API Layer
═════════════════════════════════════════════════════════════════════

    GET /api/notifications/tab-counts
    ├─ Query notifications (job_match)
    ├─ Query notifications (job_preference_reminder)
    └─ Return max count for job-interests tab

    POST /api/notifications/clear-tab
    ├─ Clear job_match notifications
    └─ Clear job_preference_reminder notifications

    PUT /api/student/job-preferences
    ├─ Save preferences
    └─ Delete reminders


Database Layer
═════════════════════════════════════════════════════════════════════

    Firestore Collections:
    
    users → (role, createdAt)
    job_preferences → (industries, jobTypes, skills, etc.)
    notifications → (type, userId, read, createdAt)
                    ├─ job_match
                    ├─ job_preference_reminder
                    └─ ... other types
```

## Notification Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LIFECYCLE                         │
└──────────────────────────────────────────────────────────────────┘

STATE 1: CREATED
┌─────────────────┐
│ Service detects │
│  no preferences │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Create Notification                     │
│ type: "job_preference_reminder"         │
│ read: false                             │
│ createdAt: timestamp                    │
└────────┬────────────────────────────────┘
         │

STATE 2: VISIBLE
┌────────────────────────────────┐
│ Notification appears in:       │
│ • Notifications list (UI)      │
│ • job-interests tab badge      │
│ • Frontend poll results        │
└────────┬───────────────────────┘
         │

STATE 3a: CLEARED (Without Saving Preferences)
┌─────────────────────────────────────────┐
│ Student opens job-interests tab         │
│ POST /clear-tab called                  │
│ Notification marked: read: true         │
│                                         │
│ Still in DB, but not visible (read)    │
│ Next 3-hour check: student still       │
│ has no preferences → NEW reminder      │
└────────┬────────────────────────────────┘
         │

STATE 3b: DELETED (After Saving Preferences)
┌─────────────────────────────────────────┐
│ Student fills & saves preferences       │
│ PUT /job-preferences called             │
│ Query for job_preference_reminder       │
│ DELETE matching notifications           │
│                                         │
│ Notification completely removed        │
│ Next 3-hour check: student has         │
│ preferences → SKIP (no reminder)        │
└────────┬────────────────────────────────┘
         │
         ▼
         DONE

(No more notifications)
```

---

**All diagrams showing the complete architecture, data flow, and state management of the Job Preferences Reminder System.**
