# 🚀 Real-Time Notifications - Quick Start Guide

## 30-Second Overview

✨ **What You Get:**
- Notification badges on every dashboard tab
- Auto-clears when tabs are opened
- Real-time updates every 15 seconds
- Works for all 4 user roles

---

## ⚡ 5-Minute Setup

### Step 1: Backend (30 seconds)
Verify these 3 endpoints exist in `server/routes/notifications.js`:

```javascript
// ✅ Already added in the file
GET  /api/notifications/tab-counts          // Get unread counts
POST /api/notifications/clear-tab           // Clear tab notifications  
POST /api/notifications/mark-read/:id       // Mark single notification read
```

**Status:** ✅ Done (Check file to confirm)

### Step 2: Frontend Hook (30 seconds)
Copy `useTabNotifications.js` to `client/src/hooks/`:

```javascript
// File: client/src/hooks/useTabNotifications.js
✅ Already created
```

### Step 3: Update Dashboards (2 minutes)
All 4 dashboards already updated:

- ✅ `AdminDashboard.jsx` - 6 tabs with badges
- ✅ `StudentDashboard.jsx` - 4 tabs with badges
- ✅ `InstitutionDashboard.jsx` - 4 tabs with badges
- ✅ `CompanyDashboard.jsx` - 2 tabs with badges

### Step 4: Test (2 minutes)
```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd client && npm start

# Login to dashboard
# Should see badges on tabs
# Click tab - badge disappears
```

---

## 🎨 What Badges Look Like

```
Tab Name             | Badge Color | Meaning
─────────────────────┼─────────────┼──────────────────
Companies 🟠3        | Orange      | Pending action
Faculties 🔵2        | Blue        | Info/Update  
Applications ✓5      | Green       | Success/Admitted
Notifications 🟠2    | Orange      | Warning/Unread
```

---

## 🧪 Quick Test

1. **Login as Admin**
   ```
   Dashboard shows:
   - [Users 🔵5]        ← New user registrations
   - [Companies 🟠1]    ← Pending companies
   - [Transcripts 🟠2]  ← Pending transcripts
   ```

2. **Click "Users" Tab**
   ```
   Badge disappears instantly ✨
   ```

3. **Wait 15 Seconds**
   ```
   Badge updates if new notifications exist
   ```

4. **Refresh Page**
   ```
   Badge reappears if still unread ✅
   ```

---

## 📊 Tabs by User Role

### 👨‍💼 Admin (6 tabs)
- Institutions
- Faculties (🔵 if new)
- Courses (🔵 if new)
- Companies (🟠 if pending)
- All Users (🔵 if new registrations)
- Verify Transcripts (🟠 if pending)

### 🎓 Student (7 tabs)
- Browse Institutions (🔵 if new)
- My Applications (✓ if admitted)
- Browse Jobs (🔵 if matching)
- My Job Applications
- My Transcript
- My Profile
- Notifications (🟠 if unread)

### 🏢 Institution (5 tabs)
- Dashboard
- Faculties (🔵 if new)
- Courses (🔵 if new)
- Applications (🟠 if pending)
- Notifications (🟠 if unread)

### 🏭 Company (2 tabs)
- My Jobs (✓ if applicants)
- Notifications (🟠 if unread)

---

## 🔧 Configuration

### Polling Interval
**File:** `client/src/hooks/useTabNotifications.js`

```javascript
// Line ~65: Change polling frequency
const interval = setInterval(fetchTabNotifications, 15000);  // 15 seconds
// Or change to:
const interval = setInterval(fetchTabNotifications, 30000);  // 30 seconds
```

### Badge Colors
**File:** `client/src/components/NotificationBadge.jsx`

```javascript
// Pre-defined variants:
variant="default"   // Red (#ef4444)
variant="warning"   // Orange (#f59e0b)
variant="success"   // Green (#10b981)
variant="info"      // Blue (#3b82f6)
```

---

## ❌ Common Issues

### "Badges not showing"
```javascript
// Check 1: Is API responding?
Open Network tab → look for /tab-counts requests
↓
// Check 2: Are there unread notifications?
Open DevTools → Application → Firestore
Look in NOTIFICATIONS collection
↓
// Check 3: Is hook imported?
Check if component has: import { useTabNotifications }
```

### "Badges not clearing"
```javascript
// Check: Is /clear-tab being called?
Open Network tab → filter for /clear-tab
Look for successful POST request
↓
// Check: Is user authenticated?
Look for Authorization header with Bearer token
```

### "Dashboard crashes"
```javascript
// Check console for errors:
Open DevTools → Console
Look for red error messages
↓
// Most likely: API endpoint not found
Verify /tab-counts endpoint exists in server/routes/notifications.js
```

---

## 📊 How It Works (Simple)

```
1. User opens dashboard
   ↓
2. Hook fetches tab counts from /api/notifications/tab-counts
   ↓
3. Display badges showing unread counts
   ↓
4. Every 15 seconds: Update counts (polling)
   ↓
5. User clicks tab
   ↓
6. POST /api/notifications/clear-tab
   ↓
7. Mark notifications as read in database
   ↓
8. Badge disappears (count = 0)
```

---

## ✅ Deployment Checklist

- [ ] All 3 backend endpoints exist
- [ ] All 4 dashboards have hook imported
- [ ] All tab buttons show badges conditionally
- [ ] Clear notification useEffect added to all dashboards
- [ ] Test in development environment
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Test in production environment
- [ ] Monitor for errors in logs

---

## 📱 Mobile Support

✅ Works on mobile browsers:
- Badges responsive and scale with screen size
- Touch-friendly tab buttons
- No performance issues on mobile

---

## 🔐 Security

✅ All endpoints require:
- Bearer token authentication
- User ID from JWT (not user-provided)
- Verification of notification ownership

---

## 🚀 Performance

✅ Optimized:
- Polls every 15 seconds (configurable)
- Only fetches counts, not full notifications
- Silent error handling (won't slow down dashboard)
- Batch operations for clearing

---

## 📞 Support

**Need help?**

1. Check the Verification Checklist: `VERIFICATION_CHECKLIST.md`
2. Read Full Setup Guide: `NOTIFICATIONS_SETUP_GUIDE.md`
3. Check troubleshooting section above
4. Review console and network tabs

---

## 🎉 Success

After setup, you should see:
1. ✅ Colored badges on dashboard tabs
2. ✅ Correct unread counts
3. ✅ Badges disappear when tabs opened
4. ✅ Automatic updates every 15 seconds
5. ✅ Dashboard continues working if API fails

---

**Ready to deploy?** Check the full setup guide: `NOTIFICATIONS_SETUP_GUIDE.md`

---

Last Updated: November 12, 2025 | Status: ✅ Complete
