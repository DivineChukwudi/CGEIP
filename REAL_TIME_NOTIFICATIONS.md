# Real-Time Tab Notifications System

## Overview
Implemented a comprehensive real-time notification system that updates notification badges for each dashboard tab when changes are made. Notifications automatically disappear when the tab is opened.

## Components Created/Updated

### 1. **New Hook: `useTabNotifications`** 
**File:** `client/src/hooks/useTabNotifications.js`

Features:
- Tracks unread notification counts for each tab independently
- Polls backend every 15 seconds for real-time updates
- Provides `clearTabNotification(tabName)` to clear notifications when tab is opened
- Provides `incrementTabNotification(tabName)` for manual updates
- Silent failure - won't break dashboards if API fails

**Tab Types Supported:**
- Admin: institutions, faculties, courses, companies, users, transcripts
- Institution: applications, faculties, courses
- Company: jobs, applicants
- Student: applications, jobs, notifications, profile

### 2. **Backend Endpoints** 
**File:** `server/routes/notifications.js`

**New Endpoints Added:**

#### `GET /api/notifications/tab-counts`
Returns per-tab notification counts based on user role:
- **Admin:** pending companies, new user registrations, pending transcripts
- **Institution:** pending applications, new faculties, new courses
- **Company:** pending qualified job applicants
- **Student:** admitted applications, matching job postings

#### `POST /api/notifications/clear-tab`
Marks all unread notifications of a specific tab type as read
- Request: `{ tab: 'institutions' }`
- Response: `{ success: true, cleared: 5 }`

#### `POST /api/notifications/mark-read/:notificationId`
Marks a specific notification as read
- Sets `read: true` and `readAt: timestamp`

### 3. **Updated Components**

#### **AdminDashboard.jsx**
- Added `useTabNotifications` hook
- Tab buttons now show colored notification badges:
  - **Red (warning):** Pending companies, pending transcripts
  - **Blue (info):** New user registrations, pending faculties, pending courses
  - **Green (success):** Admissions (for institutions)
- Notifications automatically clear when tab is opened
- Badges animate with pulse effect while showing count > 0
- Real-time polling every 15 seconds

**Sidebar Tabs with Badges:**
```jsx
- Institutions
- Faculties (✓ badge if new)
- Courses (✓ badge if new)
- Companies (⚠️ badge if pending)
- All Users (ℹ️ badge if new registrations)
- Verify Transcripts (⚠️ badge if pending)
```

#### **StudentDashboard.jsx**
- Added `useTabNotifications` hook
- Tab buttons show notifications:
  - Browse Institutions (ℹ️ if new)
  - My Applications (✓ if admitted)
  - Browse Jobs (ℹ️ if matching jobs)
  - Notifications (⚠️ if unread)
- Notifications clear when tab is opened
- Real-time updates every 15 seconds

### 4. **NotificationBadge Component**
**File:** `client/src/components/NotificationBadge.jsx` (Enhanced)

Supports 4 variants:
- **default:** Red background - critical notifications
- **warning:** Orange background - pending actions
- **success:** Green background - positive updates
- **info:** Blue background - general information

Features:
- Pulsing animation while active
- Max count display (99+)
- Glowing shadow effect

## How It Works

### Real-Time Flow
1. **User opens dashboard** → Hook fetches initial tab notification counts
2. **Backend processes changes** → Creates notification records with appropriate types
3. **Hook polls every 15 seconds** → Fetches updated counts from `/tab-counts`
4. **Tab badges update** → UI shows unread count for each tab
5. **User opens a tab** → `clearTabNotification(tabName)` called
6. **Backend marks notifications as read** → Clears the count for that tab
7. **Badge disappears** → UI reflects the cleared notifications

### Database Storage
Notifications stored in `NOTIFICATIONS` collection with:
```javascript
{
  userId: "uid",
  type: "user_registered|company_pending|application_pending|etc",
  read: false,
  readAt: null,
  createdAt: timestamp,
  data: { /* context data */ }
}
```

## Notification Types Supported

| Tab | Type | Trigger |
|-----|------|---------|
| Users | `user_registered` | New user signs up |
| Companies | `company_pending` | Company awaits approval |
| Transcripts | `transcript_pending` | Student uploads transcript |
| Faculties | `faculty_added` | Admin adds faculty |
| Courses | `course_added` | Admin/Institution adds course |
| Applications | `application_pending` | Student applies to course |
| Jobs | `job_applicant_qualified` | Qualified applicant applies to job |

## UI/UX Features

✨ **Visual Feedback:**
- Color-coded badges (red/orange/green/blue)
- Pulsing animation while unread
- Glowing shadow effect on badges
- Badges positioned next to tab icon

⚡ **Real-Time Updates:**
- Automatic polling every 15 seconds
- Instant clearing when tab is opened
- Silent error handling (won't break dashboard)

🎯 **User Experience:**
- Notifications persist across page refreshes
- Users know exactly which tabs have updates
- Notifications clear on-demand when viewing tab
- Multiple notification types supported per tab

## Example Usage

### In a Dashboard Component
```jsx
import { useTabNotifications } from '../hooks/useTabNotifications';
import NotificationBadge from '../components/NotificationBadge';

export default function Dashboard({ user }) {
  const { tabNotifications, clearTabNotification } = useTabNotifications(user.role, user.uid);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    clearTabNotification(tabName);
  };

  return (
    <button onClick={() => handleTabChange('institutions')}>
      Institutions
      {tabNotifications.institutions > 0 && (
        <NotificationBadge count={tabNotifications.institutions} variant="info" />
      )}
    </button>
  );
}
```

## Backend Implementation

### Extending for New Notifications
To add notifications for a new action:

1. **Create notification record when action occurs:**
```javascript
await db.collection('NOTIFICATIONS').add({
  userId: userId,
  type: 'new_notification_type',
  read: false,
  createdAt: new Date(),
  data: { /* relevant data */ }
});
```

2. **Add counting logic in `/tab-counts` endpoint:**
```javascript
const newNotifications = await db.collection('NOTIFICATIONS')
  .where('userId', '==', uid)
  .where('type', '==', 'new_notification_type')
  .where('read', '==', false)
  .get();
tabCounts.myTab = newNotifications.size;
```

## Performance Considerations

✅ **Optimized:**
- Only fetches counts, not full notification documents
- Uses 15-second polling (not real-time sockets for simplicity)
- Silent error handling prevents UI breakage
- Batch operations for marking multiple notifications as read

## Future Enhancements

1. **WebSocket Integration:** Replace polling with WebSocket for true real-time
2. **Sound Notifications:** Play sound on new critical notifications
3. **Desktop Notifications:** Browser push notifications
4. **Notification History:** Full notification timeline view
5. **Notification Preferences:** Let users choose which notifications they see

## Testing Checklist

- [ ] Admin sees badge for new user registrations
- [ ] Admin sees badge for pending company approvals
- [ ] Admin sees badge for pending transcripts
- [ ] Institution sees badge for new pending applications
- [ ] Student sees badge for admitted applications
- [ ] Student sees badge for matching jobs
- [ ] Badges disappear immediately when tab is opened
- [ ] Polling updates badges every 15 seconds
- [ ] Dashboard works if notifications API fails
- [ ] Badges clear across browser refreshes
