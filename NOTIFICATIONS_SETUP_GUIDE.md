# 🔔 Real-Time Tab Notifications System - Setup & Implementation Guide

## 📋 Quick Summary

A **real-time notification badge system** that:
- ✅ Shows unread notification counts on each dashboard tab
- ✅ Displays color-coded badges (Red/Orange/Green/Blue)
- ✅ Automatically clears notifications when a tab is opened
- ✅ Polls for updates every 15 seconds
- ✅ Works across all user roles (Admin, Institution, Company, Student)

---

## 🛠️ Implementation Details

### Files Created/Modified

#### **Frontend Files**

1. **`client/src/hooks/useTabNotifications.js`** (NEW)
   - Core hook for managing per-tab notification counts
   - Handles polling, clearing, and incrementing notifications
   - Provides utility functions for components

2. **Dashboard Components Updated:**
   - `client/src/pages/AdminDashboard.jsx`
   - `client/src/pages/StudentDashboard.jsx`
   - `client/src/pages/InstitutionDashboard.jsx`
   - `client/src/pages/CompanyDashboard.jsx`

3. **`client/src/components/NotificationBadge.jsx`** (Enhanced)
   - Already existed, now supports 4 color variants
   - Used across all dashboards

#### **Backend Files**

1. **`server/routes/notifications.js`** (Extended)
   - Added 3 new endpoints for tab notifications
   - Supports role-based notification counting
   - Handles batch marking of notifications as read

---

## 🚀 How to Deploy

### Step 1: Verify Backend Endpoints
Make sure these endpoints exist in `server/routes/notifications.js`:

```javascript
// Get per-tab notification counts
GET /api/notifications/tab-counts

// Clear notifications for a tab
POST /api/notifications/clear-tab { tab: 'institutions' }

// Mark single notification as read
POST /api/notifications/mark-read/:notificationId
```

### Step 2: Update Frontend Imports
Ensure all dashboard components import:
```jsx
import { useTabNotifications } from '../hooks/useTabNotifications';
import NotificationBadge from '../components/NotificationBadge';
```

### Step 3: Test in Local Development

```bash
# Terminal 1: Start server
cd server
npm start  # Runs on http://localhost:5000

# Terminal 2: Start client
cd client
npm start  # Runs on http://localhost:3000
```

### Step 4: Test Notifications
1. Login as Admin
2. Check dashboard tabs - badges should show if there are unread notifications
3. Click on a tab - badge should disappear
4. Refresh page - badge should return (unread notifications persist)

---

## 📱 Dashboard Support

### Admin Dashboard
**Tabs with Notifications:**
- 🔵 Institutions (Blue - info)
- 🔵 Faculties (Blue - info)
- 🔵 Courses (Blue - info)
- 🟠 Companies (Orange - warning/pending)
- 🔵 All Users (Blue - info)
- 🟠 Verify Transcripts (Orange - warning/pending)

### Student Dashboard
**Tabs with Notifications:**
- 🔵 Browse Institutions (Blue - info)
- 🟢 My Applications (Green - success)
- 🔵 Browse Jobs (Blue - info)
- 🟠 Notifications (Orange - warning/unread)

### Institution Dashboard
**Tabs with Notifications:**
- 🔵 Faculties (Blue - info)
- 🔵 Courses (Blue - info)
- 🟠 Applications (Orange - warning/pending)
- 🟠 Notifications (Orange - warning/unread)

### Company Dashboard
**Tabs with Notifications:**
- 🟢 My Jobs (Green - success/applicants)
- 🟠 Notifications (Orange - warning/unread)

---

## 🔧 Backend Endpoint Details

### 1. GET `/api/notifications/tab-counts`

**Purpose:** Fetch unread notification counts for each tab based on user role

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "institutions": 2,
  "faculties": 0,
  "courses": 1,
  "companies": 3,
  "users": 5,
  "transcripts": 2,
  "applications": 1,
  "jobs": 0,
  "profile": 0,
  "notifications": 4
}
```

**Logic by Role:**
- **Admin:** Counts pending companies, new user registrations, pending transcripts
- **Institution:** Counts pending applications, new faculties, new courses
- **Company:** Counts pending qualified job applicants
- **Student:** Counts admitted applications, matching jobs

### 2. POST `/api/notifications/clear-tab`

**Purpose:** Mark all notifications of a specific tab as read

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "tab": "institutions"
}
```

**Response:**
```json
{
  "success": true,
  "cleared": 5
}
```

**Tab Values Supported:**
- `companies`, `users`, `transcripts`, `applications`, `faculties`, `courses`, `jobs`, `notifications`

### 3. POST `/api/notifications/mark-read/:notificationId`

**Purpose:** Mark a single notification as read

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true
}
```

---

## 💾 Database Structure

Notifications stored in `NOTIFICATIONS` collection:

```javascript
{
  id: "notif_123",
  userId: "user_uid_456",
  type: "user_registered",  // See types below
  read: false,
  readAt: null,
  createdAt: Timestamp(2024, 11, 12),
  data: {
    // Context-specific data
  }
}
```

### Notification Types:
- `user_registered` - New user signup (Admin)
- `company_pending` - Company awaiting approval (Admin)
- `transcript_pending` - Pending transcript verification (Admin)
- `application_pending` - New course application (Institution)
- `faculty_added` - New faculty added (Institution)
- `course_added` - New course added (Institution)
- `job_applicant_qualified` - Qualified job applicant (Company)
- `application_accepted` - Application accepted (Student)
- `job_matching` - Matching job found (Student)

---

## 🎨 Notification Badge Variants

```jsx
// Red - Critical/Error
<NotificationBadge count={5} variant="default" />

// Orange - Warning/Pending
<NotificationBadge count={3} variant="warning" />

// Green - Success/Positive
<NotificationBadge count={1} variant="success" />

// Blue - Info/General
<NotificationBadge count={2} variant="info" />
```

---

## 🔄 Real-Time Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User Opens Dashboard                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────┐
        │ useTabNotifications Hook Initializes    │
        │ Fetches /api/notifications/tab-counts   │
        └────────────────┬────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────┐
        │ Tab Buttons Display Badges              │
        │ With Unread Counts                      │
        └────────────────┬────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
  ┌─────────────────┐          ┌──────────────────┐
  │ Every 15 Seconds│          │ User Opens Tab   │
  │ Poll for Updates│          │ Calls            │
  └────────┬────────┘          │ clearTabNotif()  │
           │                   └────────┬─────────┘
           │                            │
           ▼                            ▼
    ┌──────────────┐          ┌──────────────────────┐
    │ Update Badge │          │ POST /clear-tab      │
    │ Counts       │          │ Marks Notifs as Read │
    └──────────────┘          └────────┬─────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Badge Disappears │
                              │ Count = 0        │
                              └──────────────────┘
```

---

## 🧪 Testing Checklist

### Frontend Testing
- [ ] Badges appear with correct colors
- [ ] Badges show correct count numbers
- [ ] Badges disappear when tab is opened
- [ ] Polling updates badge counts every 15 seconds
- [ ] Dashboard works if API fails (silent error handling)
- [ ] Badges persist after page refresh
- [ ] All 4 user roles see their respective tabs

### Backend Testing
- [ ] `/tab-counts` returns correct counts per role
- [ ] `/clear-tab` marks notifications as read
- [ ] `/mark-read/:id` marks single notification as read
- [ ] Authentication required for all endpoints
- [ ] Error handling for invalid tab names

### Integration Testing
- [ ] Admin: Create user → badge appears on Users tab
- [ ] Admin: Approve company → badge disappears from Companies tab
- [ ] Institution: Receive application → badge appears on Applications tab
- [ ] Company: Qualified applicant → badge appears on Jobs tab
- [ ] Student: Get admitted → badge appears on Applications tab

---

## 🐛 Troubleshooting

### Badges Not Appearing
1. Check network tab - is `/tab-counts` API returning data?
2. Verify `useTabNotifications` hook is imported
3. Check browser console for errors

### Badges Not Clearing
1. Verify `/clear-tab` endpoint is being called
2. Check if user is authenticated (token in localStorage)
3. Verify notification records have `read: false` in database

### Performance Issues
1. Polling every 15 seconds might be too frequent
2. Adjust in `useTabNotifications.js`: Change `15000` to `30000` for 30-second polling
3. Consider WebSocket instead of polling for production

### Notifications Showing Wrong Counts
1. Check notification type in database
2. Verify role-based logic in `/tab-counts` endpoint
3. Check if `read` field is properly set in NOTIFICATIONS collection

---

## 📚 Code Examples

### Adding New Tab Notifications

**1. Update `useTabNotifications` hook:**
```javascript
const [tabNotifications, setTabNotifications] = useState({
  myNewTab: 0,  // Add here
  // ... other tabs
});
```

**2. Update backend endpoint logic:**
```javascript
// In GET /api/notifications/tab-counts
if (role === 'myRole') {
  const myNotifications = await db.collection(collections.NOTIFICATIONS)
    .where('userId', '==', uid)
    .where('type', '==', 'my_notification_type')
    .where('read', '==', false)
    .get();
  tabCounts.myNewTab = myNotifications.size;
}
```

**3. Update dashboard component:**
```jsx
<button onClick={() => setActiveTab('myNewTab')}>
  <FaIcon /> My Tab
  {tabNotifications?.myNewTab > 0 && (
    <NotificationBadge count={tabNotifications.myNewTab} variant="info" />
  )}
</button>
```

---

## 🚀 Future Enhancements

1. **WebSocket Support:** Real-time updates instead of polling
2. **Sound Notifications:** Play sound on new critical notifications
3. **Push Notifications:** Browser/desktop notifications
4. **Notification History:** Full timeline view of all notifications
5. **User Preferences:** Customize which notifications to receive
6. **Email Notifications:** Summary emails for unread notifications
7. **Notification Groups:** Group related notifications together

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all files are properly updated
3. Check browser console for JavaScript errors
4. Check server logs for API errors
5. Verify database structure and collections exist

---

**Last Updated:** November 12, 2025
**System:** CGIEP Real-Time Notifications v1.0
