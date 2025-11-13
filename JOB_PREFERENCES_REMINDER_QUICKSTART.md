# 🔔 Job Preferences Reminder - Quick Start

## What Was Implemented

A background service that sends **persistent 3-hour interval reminder notifications** to students who haven't filled in their job preferences. Reminders automatically disappear once the student completes their preferences.

## Files Created/Modified

### NEW FILES
- ✅ `server/services/jobPreferencesReminder.js` (209 lines)
  - Main service handling reminder logic
  - Runs every 3 hours automatically
  - Checks for students with incomplete preferences
  - Creates persistent notifications

### MODIFIED FILES

1. **`server/server.js`**
   - Added JobPreferencesReminder service initialization
   - Starts with server on bootup
   - Logs service status on startup

2. **`server/routes/student.js`**
   - Enhanced PUT `/job-preferences` endpoint
   - Automatically deletes old reminder notifications when preferences are saved
   - Prevents orphaned notifications

3. **`server/routes/notifications.js`**
   - Enhanced GET `/tab-counts` for students
   - Adds job_preference_reminder count to job-interests tab badge
   - Enhanced POST `/clear-tab` to handle both job_match and job_preference_reminder

## How It Works

```
Every 3 Hours:
  ↓
Check all students registered >24 hours ago
  ↓
If NO job preferences filled:
  ↓
Send "Complete Your Job Preferences" reminder
  ↓
Notification appears in job-interests tab
  ↓
Student sees badge showing reminder count
  ↓
When student fills preferences:
  ↓
Saves with PUT /job-preferences
  ↓
Old reminders auto-deleted
  ↓
Badge disappears from tab
```

## Key Features

✅ **Automatic Scheduling** - Runs every 3 hours in background
✅ **Smart Deduplication** - Prevents duplicate notifications per interval
✅ **Persistent UI** - Shows reminder in job-interests tab
✅ **Auto Cleanup** - Deletes reminders when preferences saved
✅ **Detailed Logging** - Full audit trail of reminder operations
✅ **Error Handling** - Graceful degradation if issues occur
✅ **Configurable** - Interval can be changed at runtime

## Notification Details

**Type**: `job_preference_reminder`

**Title**: ⚙️ Complete Your Job Preferences

**Message**: Help us match you with the perfect job opportunities! Fill in your job preferences to start receiving personalized job recommendations. Go to "Job Interests" in your dashboard.

**Action URL**: `/dashboard/job-interests`

**Behavior**:
- Created when preferences are empty/incomplete
- Sent once per 3-hour interval
- Persists until preferences are saved
- Auto-deleted when preferences filled
- Shows in notifications list and job-interests tab badge

## Configuration

### Change Interval
```javascript
// In server.js, line ~180
const jobPreferencesReminder = new JobPreferencesReminder(
  6 * 60 * 60 * 1000  // Change 3 hours to 6 hours
);
```

### Change Message
Edit `sendPreferenceReminder()` in `server/services/jobPreferencesReminder.js`

### Change Eligibility
Edit `checkAndSendReminders()` method:
- Default: Students >24 hours old with no preferences
- Can modify to check other criteria

## API Changes

### GET /api/notifications/tab-counts (Student)
Returns:
```json
{
  "my-applications": 0,
  "job-interests": 2,    // Includes both job_match + job_preference_reminder
  "jobs": 0
}
```

### POST /api/notifications/clear-tab
```json
{
  "tab": "job-interests"
}
```
- Clears both `job_match` AND `job_preference_reminder`
- Returns total cleared count

### PUT /api/student/job-preferences
```json
{
  "industries": ["Technology", "Finance"],
  "jobTypes": ["Full-time", "Internship"],
  "skills": ["Python", "React"],
  "workType": ["remote", "hybrid"],
  "location": "New York",
  "salaryMin": "50000",
  "salaryMax": "100000"
}
```
- Saves preferences
- **Auto-deletes** old reminder notifications
- No more manual cleanup needed

## Console Output

On server startup:
```
✅ Job Preferences Reminder Service Started
   Interval: 3 hours
   Status: Running
```

Every 3 hours:
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

## Testing

### Trigger Manual Check
```javascript
await jobPreferencesReminder.triggerManualCheck();
```

### Check Status
```javascript
const status = jobPreferencesReminder.getStatus();
// {
//   isRunning: true,
//   interval: "3 hours",
//   nextCheck: Date,
//   studentsPending: 5
// }
```

### View in Firestore
Check `notifications` collection:
```
type = "job_preference_reminder"
userId = "[student-uid]"
read = false
```

## Integration Points

### StudentDashboard
- Job-interests tab shows badge with reminder count
- Clicking notification navigates to job preferences form
- useTabNotifications hook handles polling and clearing

### StudentJobPreferences Form
- Already exists at `/dashboard/job-interests`
- Saving fills in preferences
- Auto-triggers reminder cleanup

### Notification System
- Integrated with existing notification infrastructure
- Follows same patterns as job_match notifications
- Uses existing UI components

## Database Structure

### Notification Document
```javascript
{
  userId: "student-uid",
  type: "job_preference_reminder",
  title: "⚙️ Complete Your Job Preferences",
  message: "Help us match you with the perfect job opportunities!...",
  read: false,
  createdAt: "2024-01-20T10:30:00.000Z",
  actionUrl: "/dashboard/job-interests"
}
```

### Job Preferences Document
```javascript
{
  industries: [],
  jobTypes: [],
  skills: [],
  workType: [],
  salaryMin: "",
  salaryMax: "",
  location: "",
  updatedAt: "2024-01-20T11:00:00.000Z"
}
```

## Performance

- ✅ Efficient Firestore queries (filtered by role and createdAt)
- ✅ Non-blocking async operations
- ✅ 3-hour interval prevents notification spam
- ✅ In-memory tracking prevents duplicate sends
- ✅ Scales efficiently with large user bases

## Status

✅ **COMPLETE AND TESTED**
- No compilation errors
- All integration points verified
- Service auto-starts with server
- Notifications properly persist
- Cleanup works automatically
- Tab integration complete

## Documentation

Full implementation details available in:
- `JOB_PREFERENCES_REMINDER_IMPLEMENTATION.md` (Comprehensive)
- This file (Quick start)

## Next Steps (Optional)

Future enhancements could include:
- Email reminders in addition to in-app
- Reminder escalation (more frequent after N reminders)
- Analytics on reminder effectiveness
- Student customizable reminder frequency
- Bulk preference completion suggestions
