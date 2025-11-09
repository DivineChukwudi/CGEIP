// server/routes/notifications.js
const express = require('express');
const router = express.Router();
const { db, collections } = require('../config/firebase');
const { verifyToken } = require('../middlewares/auth');

// Get notification counts for the current user
router.get('/counts', verifyToken, async (req, res) => {
  try {
    const { uid, role } = req.user;
    const counts = {
      pendingCompanies: 0,
      totalUsers: 0,
      pendingApplications: 0,
      totalApplications: 0,
      admittedApplications: 0,
      newApplicants: 0,
      totalJobs: 0,
      unreadNotifications: 0
    };

    // ADMIN COUNTS
    if (role === 'admin') {
      // Count pending companies
      const pendingCompaniesSnapshot = await db.collection(collections.USERS)
        .where('role', '==', 'company')
        .where('status', '==', 'pending')
        .get();
      counts.pendingCompanies = pendingCompaniesSnapshot.size;

      // Count NEW users registered in last 7 days (not just total)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const newUsersSnapshot = await db.collection(collections.USERS)
        .where('createdAt', '>=', sevenDaysAgo.toISOString())
        .get();
      counts.totalUsers = newUsersSnapshot.size; // Actually "new users" not "total users"
    }

    // INSTITUTION COUNTS
    if (role === 'institution') {
      // Get institution ID (assuming uid is the institution ID)
      const institutionId = uid;

      // Count pending applications
      const pendingAppsSnapshot = await db.collection(collections.APPLICATIONS)
        .where('institutionId', '==', institutionId)
        .where('status', '==', 'pending')
        .get();
      counts.pendingApplications = pendingAppsSnapshot.size;

      // Count total applications
      const totalAppsSnapshot = await db.collection(collections.APPLICATIONS)
        .where('institutionId', '==', institutionId)
        .get();
      counts.totalApplications = totalAppsSnapshot.size;
    }

    // STUDENT COUNTS
    if (role === 'student') {
      // Count admitted applications (not yet selected)
      const admittedAppsSnapshot = await db.collection(collections.APPLICATIONS)
        .where('studentId', '==', uid)
        .where('status', '==', 'admitted')
        .where('selected', '==', false)
        .get();
      counts.admittedApplications = admittedAppsSnapshot.size;

      // Count total applications
      const totalAppsSnapshot = await db.collection(collections.APPLICATIONS)
        .where('studentId', '==', uid)
        .get();
      counts.totalApplications = totalAppsSnapshot.size;
    }

    // COMPANY COUNTS
    if (role === 'company') {
      // Get company's jobs
      const jobsSnapshot = await db.collection(collections.JOBS)
        .where('companyId', '==', uid)
        .where('status', '==', 'active')
        .get();
      
      counts.totalJobs = jobsSnapshot.size;

      if (jobsSnapshot.size > 0) {
        const jobIds = jobsSnapshot.docs.map(doc => doc.id);
        
        // Count qualified applicants (in batches of 10 due to Firestore limitation)
        let totalQualifiedApplicants = 0;
        
        for (let i = 0; i < jobIds.length; i += 10) {
          const batchIds = jobIds.slice(i, i + 10);
          
          const applicantsSnapshot = await db.collection(collections.JOB_APPLICATIONS)
            .where('jobId', 'in', batchIds)
            .where('status', '==', 'pending')
            .get();
          
          // Count only qualified applicants (score >= 70%)
          const qualifiedCount = applicantsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return (data.qualificationScore || 0) >= 70;
          }).length;
          
          totalQualifiedApplicants += qualifiedCount;
        }
        
        counts.newApplicants = totalQualifiedApplicants;
      }
    }

    // UNREAD NOTIFICATIONS (ALL ROLES)
    const unreadNotificationsSnapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', uid)
      .where('read', '==', false)
      .get();
    counts.unreadNotifications = unreadNotificationsSnapshot.size;

    res.json(counts);
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notification counts',
      message: error.message 
    });
  }
});

// Get all notifications for the current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const notificationsSnapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      message: error.message 
    });
  }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const notificationRef = db.collection(collections.NOTIFICATIONS).doc(id);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify ownership
    if (notificationDoc.data().userId !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await notificationRef.update({ read: true, readAt: new Date() });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      message: error.message 
    });
  }
});

// Mark all notifications as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const unreadNotificationsSnapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    unreadNotificationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true, readAt: new Date() });
    });

    await batch.commit();

    res.json({ 
      success: true, 
      message: 'All notifications marked as read',
      count: unreadNotificationsSnapshot.size
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark all notifications as read',
      message: error.message 
    });
  }
});

// Mark notifications as read by category (for auto-clear on tab view)
router.put('/read-by-category', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Map categories to notification types
    const categoryMap = {
      'companies': ['company_registered', 'company_approved', 'company_suspended'],
      'users': ['user_registered', 'user_deleted'],
      'applications': ['application_submitted', 'application_reviewed', 'application_admitted'],
      'jobs': ['job_posted', 'job_application_received', 'job_application_status'],
    };

    const notificationTypes = categoryMap[category];
    if (!notificationTypes) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const unreadNotificationsSnapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', uid)
      .where('type', 'in', notificationTypes)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    unreadNotificationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true, readAt: new Date() });
    });

    await batch.commit();

    res.json({ 
      success: true, 
      message: `${category} notifications marked as read`,
      count: unreadNotificationsSnapshot.size
    });
  } catch (error) {
    console.error('Error marking category notifications as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark notifications as read',
      message: error.message 
    });
  }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const notificationRef = db.collection(collections.NOTIFICATIONS).doc(id);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify ownership
    if (notificationDoc.data().userId !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await notificationRef.delete();

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification',
      message: error.message 
    });
  }
});

module.exports = router;