# Job Preferences Reminder Implementation

## Overview
Implemented a 3-hour interval reminder notification system that reminds students to complete their job preferences. This system ensures students don't miss out on job recommendations due to incomplete preference settings.

## Architecture

### Service: JobPreferencesReminder (`server/services/jobPreferencesReminder.js`)

**Purpose**: Background service that sends persistent reminder notifications to students who haven't filled in their job preferences.

**Key Features**:
- ✅ Runs every 3 hours (configurable interval)
- ✅ Checks all active students (registered >24 hours ago)
- ✅ Identifies students with missing or incomplete job preferences
- ✅ Sends reminder notifications only once per interval per student
- ✅ Prevents duplicate notifications with intelligent tracking
- ✅ Provides detailed logging for monitoring

**Core Methods**:

```javascript
start()                           // Start the reminder service
stop()                            // Stop the service gracefully
checkAndSendReminders()          // Main check logic (runs every 3 hours)
sendPreferenceReminder()         // Create notification for a student
setInterval(milliseconds)        // Update check interval
getStatus()                      // Get service status
triggerManualCheck()             // Manual trigger for testing
```

### Database Integration

**Collections Used**:
- `USERS` - Query students with role='student' and createdAt >24 hours ago
- `JOB_PREFERENCES` - Check if preferences exist and are filled
- `NOTIFICATIONS` - Store reminder notifications

**Notification Type**: `job_preference_reminder`

**Preference Data Structure**:
```javascript
{
  industries: [],
  jobTypes: [],
  skills: [],
  workType: [],
  salaryMin: '',
  salaryMax: '',
  location: '',
  updatedAt: 'ISO timestamp'
}
```

### API Endpoints Modified

#### 1. **PUT /api/student/job-preferences** (Enhanced)
- **New Behavior**: Automatically deletes old reminder notifications when preferences are saved
- **Logic**:
  - Saves the student's job preferences
  - Queries for all `job_preference_reminder` notifications
  - Deletes all found reminders
  - Logs the cleanup operation

```javascript
// Deletes reminders like this:
DELETE FROM NOTIFICATIONS 
WHERE userId = '{studentId}' 
  AND type = 'job_preference_reminder'
```

#### 2. **GET /api/notifications/tab-counts** (Enhanced for Students)
- **New Behavior**: Includes job preference reminder count in job-interests tab
- **Logic**:
  - Counts `job_match` notifications (job recommendations)
  - Counts `job_preference_reminder` notifications
  - Returns max of both counts to show in tab badge

```javascript
tabCounts['job-interests'] = Math.max(
  jobMatches.size,              // Job match recommendations
  preferenceReminders.size      // Preference reminder notifications
);
```

#### 3. **POST /api/notifications/clear-tab** (Enhanced for job-interests)
- **New Behavior**: Clears both `job_match` and `job_preference_reminder` when job-interests tab is opened
- **Logic**:
  - Handles multiple notification types for single tab
  - Marks all job_match AND job_preference_reminder as read
  - Provides consolidated response

```javascript
// Clears both types:
'job-interests': ['job_match', 'job_preference_reminder']
```

## Server Integration

### server.js Changes

**Added Service Initialization**:
```javascript
// Require the service
const JobPreferencesReminder = require('./services/jobPreferencesReminder');
const jobPreferencesReminder = new JobPreferencesReminder(
  3 * 60 * 60 * 1000  // 3 hours interval
);

// Start on server startup (after Firebase is initialized)
jobPreferencesReminder.start();
```

**Console Output on Startup**:
```
✅ Job Preferences Reminder Service Started
   Interval: 3 hours
   Status: Running
```

## How It Works - Step by Step

### 1. **Service Initialization**
```
Server Starts
  ↓
Firebase Initialized
  ↓
JobPreferencesReminder instantiated (3-hour interval)
  ↓
First check scheduled to run in 3 hours
```

### 2. **Periodic Check (Every 3 Hours)**
```
Check triggered
  ↓
Query all students with role='student' (registered >24 hours ago)
  ↓
For each student:
    - Check if job_preferences doc exists
    - Check if preferences have actual values
    - If empty/missing AND haven't sent reminder in 3 hours:
        → Create notification
        → Track reminder time
```

### 3. **Notification Creation**
```javascript
{
  userId: 'student-uid',
  type: 'job_preference_reminder',
  title: '⚙️ Complete Your Job Preferences',
  message: 'Help us match you with the perfect job opportunities!...',
  read: false,
  createdAt: '2024-01-20T10:30:00.000Z',
  actionUrl: '/dashboard/job-interests'
}
```

### 4. **Student Fills Preferences**
```
Student opens Job Interests tab
  ↓
Student fills in industries, job types, skills, etc.
  ↓
Clicks "Save Preferences"
  ↓
PUT /api/student/job-preferences called
  ↓
Preferences saved to database
  ↓
Old job_preference_reminder notifications deleted
  ↓
Notification badge cleared from tab
  ↓
Student sees no more reminders
```

### 5. **Notification Flow in UI**
```
Tab Badge Shows
  ↓
"Job Interests" tab shows badge with reminder count
  ↓
Student opens tab
  ↓
POST /api/notifications/clear-tab sent
  ↓
Both job_match and job_preference_reminder marked as read
  ↓
Badge disappears
  ↓
Notification persists until preferences filled
```

## Testing & Monitoring

### Manual Trigger (For Testing)
```javascript
// In any route or controller
const jobPreferencesReminder = require('./services/jobPreferencesReminder');
await jobPreferencesReminder.triggerManualCheck();
```

### Monitor Status
```javascript
const status = jobPreferencesReminder.getStatus();
console.log(status);
// Output:
// {
//   isRunning: true,
//   interval: "3 hours",
//   nextCheck: Date,
//   studentsPending: 5
// }
```

### Console Logging
The service provides detailed logging:
```
🔔 Job Preferences Reminder Check - 2024-01-20T10:30:00.000Z
📋 Checking 250 students for job preferences...
   ✓ John Doe has job preferences set
   📢 Sending reminder to Jane Smith
   → Alice Johnson already has unread reminder
   ✓ Reminder notification created for Jane Smith
✅ Job Preferences Reminder - Sent 1 reminders
📅 Next check in 3 hours
```

## Configuration

### Change Interval
```javascript
// In server.js
const jobPreferencesReminder = new JobPreferencesReminder(
  6 * 60 * 60 * 1000  // Change to 6 hours
);

// Or dynamically
jobPreferencesReminder.setInterval(2 * 60 * 60 * 1000);  // 2 hours
```

### Change Notification Message
Edit `sendPreferenceReminder()` in `jobPreferencesReminder.js`:
```javascript
const notificationData = {
  title: 'Your custom title',
  message: 'Your custom message',
  // ...
};
```

### Eligibility Requirements
Students must meet **ALL** of these to not receive reminders:
1. ✅ Registered >24 hours ago (not brand new users)
2. ✅ Have a `job_preferences` document in Firebase
3. ✅ At least ONE of: industries, jobTypes, skills, workType, location, or salary range

## Database Queries Used

### Find Students Without Preferences
```firestore
db.collection('users')
  .where('role', '==', 'student')
  .where('createdAt', '<=', 24HoursAgo)
  .get()
```

### Check Existing Reminder
```firestore
db.collection('notifications')
  .where('userId', '==', uid)
  .where('type', '==', 'job_preference_reminder')
  .where('read', '==', false)
  .limit(1)
  .get()
```

### Delete Reminders on Save
```firestore
db.collection('notifications')
  .where('userId', '==', uid)
  .where('type', '==', 'job_preference_reminder')
  .delete()  // Delete all matching docs
```

## Integration Points

### With JobMatcher Service
- **JobMatcher**: Sends `job_match` notifications for job recommendations
- **JobPreferencesReminder**: Sends `job_preference_reminder` notifications for incomplete profiles
- **Both** appear in the job-interests tab and badge
- **Both** are cleared together when student opens job-interests tab

### With StudentDashboard
- Tab badge shows max count of job_match + job_preference_reminder notifications
- Notifications appear in notifications list
- Action URL: `/dashboard/job-interests`
- Students can click notification to jump to preferences form

### With Frontend useTabNotifications Hook
- Polls `/api/notifications/tab-counts` every 15 seconds
- Shows badge for job-interests tab when reminders exist
- Calls `/api/notifications/clear-tab` when tab opened
- Both types cleared simultaneously

## Error Handling

### Graceful Degradation
- Service continues if reminder cleanup fails
- Individual student failures don't stop entire batch
- Comprehensive error logging for debugging

### Safeguards
```javascript
try {
  await this.checkAndSendReminders();
} catch (error) {
  console.error('❌ Error in job preferences reminder:', error);
  // Service continues running, retries in 3 hours
}
```

## Performance Considerations

### Database Query Optimization
- ✅ Indexes on `users.role`, `users.createdAt`
- ✅ Filters: only active students (>24 hours old)
- ✅ Prevents duplicate notifications with in-memory tracking

### Frequency
- ✅ 3-hour interval prevents notification spam
- ✅ Tracks last reminder time per student
- ✅ Only one notification per student per interval

### Scalability
- ✅ Runs async (doesn't block server operations)
- ✅ Batch delete operations for cleanup
- ✅ Efficient Firestore queries with proper filtering

## File Locations

```
server/
  ├── services/
  │   ├── jobPreferencesReminder.js (NEW - 209 lines)
  │   └── jobMatcher.js (existing)
  ├── routes/
  │   ├── student.js (MODIFIED - PUT /job-preferences)
  │   └── notifications.js (MODIFIED - tab-counts, clear-tab)
  └── server.js (MODIFIED - Service initialization)
```

## Summary

| Feature | Status | Details |
|---------|--------|---------|
| 3-hour reminder service | ✅ Complete | Runs every 3 hours automatically |
| Notification creation | ✅ Complete | Creates persistent reminders |
| Notification cleanup | ✅ Complete | Auto-deletes when preferences saved |
| Tab badge integration | ✅ Complete | Shows in job-interests tab |
| Tab clearing | ✅ Complete | Clears all related notifications |
| Error handling | ✅ Complete | Graceful degradation implemented |
| Logging | ✅ Complete | Detailed console output |
| Configuration | ✅ Complete | Interval is configurable |

## Future Enhancements

Possible improvements:
- [ ] Email reminders as well as in-app
- [ ] Configurable reminder frequency per student
- [ ] Reminder escalation (increase frequency after N reminders)
- [ ] Analytics on reminder effectiveness
- [ ] Customizable reminder messages
- [ ] Bulk operations for preference completion
