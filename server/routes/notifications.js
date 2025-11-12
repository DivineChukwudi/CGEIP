// server/routes/notifications.js - FIXED VERSION
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

    // ADMIN COUNTS - FIXED: Only count UNREAD user notifications
    if (role === 'admin') {
      // Count pending companies
      const pendingCompaniesSnapshot = await db.collection(collections.USERS)
        .where('role', '==', 'company')
        .where('status', '==', 'pending')
        .get();
      counts.pendingCompanies = pendingCompaniesSnapshot.size;

      // FIXED: Count only UNREAD user registration notifications
      const unreadUserNotifications = await db.collection(collections.NOTIFICATIONS)
        .where('userId', '==', uid)
        .where('type', '==', 'user_registered')
        .where('read', '==', false)
        .get();
      
      counts.totalUsers = unreadUserNotifications.size;
    }

    // INSTITUTION COUNTS
    if (role === 'institution') {
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

    // FIXED: Map categories properly
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

router.get('/counts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;
    
    const counts = {
      // Admin counts
      pendingCompanies: 0,
      totalUsers: 0,
      pendingTranscripts: 0,
      
      // Institution counts
      pendingApplications: 0,
      totalApplications: 0,
      
      // Student counts
      admittedApplications: 0,
      
      // Company counts
      newApplicants: 0,
      totalJobs: 0,
      
      // Universal
      unreadNotifications: 0
    };

    // Get unread notifications count (universal)
    const unreadSnapshot = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    counts.unreadNotifications = unreadSnapshot.size;

    // Role-specific counts
    if (userRole === 'admin') {
      // Pending companies
      const pendingCompaniesSnapshot = await db.collection(collections.USERS)
        .where('role', '==', 'company')
        .where('status', '==', 'pending')
        .get();
      counts.pendingCompanies = pendingCompaniesSnapshot.size;
      
      // Total new users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newUsersSnapshot = await db.collection(collections.USERS)
        .where('createdAt', '>=', sevenDaysAgo.toISOString())
        .get();
      counts.totalUsers = newUsersSnapshot.size;
      
      // Pending transcripts (NEW)
      const pendingTranscriptsSnapshot = await db.collection(collections.TRANSCRIPTS)
        .where('verified', '==', false)
        .get();
      counts.pendingTranscripts = pendingTranscriptsSnapshot.size;
      
    } else if (userRole === 'institution') {
      // Get institution's courses
      const coursesSnapshot = await db.collection(collections.COURSES)
        .where('institutionId', '==', userId)
        .get();
      const courseIds = coursesSnapshot.docs.map(doc => doc.id);
      
      if (courseIds.length > 0) {
        // Pending applications
        let totalPending = 0;
        let totalAll = 0;
        
        for (let i = 0; i < courseIds.length; i += 10) {
          const batch = courseIds.slice(i, i + 10);
          
          const pendingSnapshot = await db.collection(collections.APPLICATIONS)
            .where('courseId', 'in', batch)
            .where('status', '==', 'pending')
            .get();
          totalPending += pendingSnapshot.size;
          
          const allSnapshot = await db.collection(collections.APPLICATIONS)
            .where('courseId', 'in', batch)
            .get();
          totalAll += allSnapshot.size;
        }
        
        counts.pendingApplications = totalPending;
        counts.totalApplications = totalAll;
      }
      
    } else if (userRole === 'student') {
      // Admitted applications
      const admittedSnapshot = await db.collection(collections.APPLICATIONS)
        .where('studentId', '==', userId)
        .where('status', '==', 'admitted')
        .get();
      counts.admittedApplications = admittedSnapshot.size;
      
    } else if (userRole === 'company') {
      // Get company's jobs
      const jobsSnapshot = await db.collection(collections.JOBS)
        .where('companyId', '==', userId)
        .get();
      const jobIds = jobsSnapshot.docs.map(doc => doc.id);
      counts.totalJobs = jobsSnapshot.size;
      
      if (jobIds.length > 0) {
        // New applicants (qualified - score >= 70%)
        let totalQualified = 0;
        
        for (let i = 0; i < jobIds.length; i += 10) {
          const batch = jobIds.slice(i, i + 10);
          
          const applicantsSnapshot = await db.collection(collections.JOB_APPLICATIONS)
            .where('jobId', 'in', batch)
            .where('qualificationMatch', '>=', 70)
            .where('status', '==', 'pending')
            .get();
          totalQualified += applicantsSnapshot.size;
        }
        
        counts.newApplicants = totalQualified;
      }
    }

    res.json(counts);
  } catch (error) {
    console.error('Get notification counts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get per-tab notification counts for dashboard tabs
router.get('/tab-counts', verifyToken, async (req, res) => {
  try {
    const { uid, role } = req.user;
    const tabCounts = {
      institutions: 0,
      faculties: 0,
      courses: 0,
      companies: 0,
      users: 0,
      transcripts: 0,
      applications: 0,
      jobs: 0,
      profile: 0,
      notifications: 0
    };

    // Count unread notifications for the user
    const unreadNotifs = await db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', uid)
      .where('read', '==', false)
      .get();
    tabCounts.notifications = unreadNotifs.size;

    // ADMIN TAB COUNTS
    if (role === 'admin') {
      // Pending companies
      const pendingCompanies = await db.collection(collections.USERS)
        .where('role', '==', 'company')
        .where('status', '==', 'pending')
        .get();
      tabCounts.companies = pendingCompanies.size;

      // New user registrations
      const newUsers = await db.collection(collections.NOTIFICATIONS)
        .where('userId', '==', uid)
        .where('type', '==', 'user_registered')
        .where('read', '==', false)
        .get();
      tabCounts.users = newUsers.size;

      // Pending transcripts
      const pendingTranscripts = await db.collection(collections.NOTIFICATIONS)
        .where('userId', '==', uid)
        .where('type', '==', 'transcript_pending')
        .where('read', '==', false)
        .get();
      tabCounts.transcripts = pendingTranscripts.size;
    }

    // INSTITUTION TAB COUNTS
    if (role === 'institution') {
      const instId = uid;

      // Pending applications
      const pendingApps = await db.collection(collections.APPLICATIONS)
        .where('institutionId', '==', instId)
        .where('status', '==', 'pending')
        .get();
      tabCounts.applications = pendingApps.size;

      // New faculties added
      const newFaculties = await db.collection(collections.NOTIFICATIONS)
        .where('userId', '==', uid)
        .where('type', '==', 'faculty_added')
        .where('read', '==', false)
        .get();
      tabCounts.faculties = newFaculties.size;

      // New courses added
      const newCourses = await db.collection(collections.NOTIFICATIONS)
        .where('userId', '==', uid)
        .where('type', '==', 'course_added')
        .where('read', '==', false)
        .get();
      tabCounts.courses = newCourses.size;
    }

    // COMPANY TAB COUNTS
    if (role === 'company') {
      const companyId = uid;

      // Pending job applicants (qualified)
      const jobs = await db.collection(collections.JOBS)
        .where('companyId', '==', companyId)
        .get();
      
      let pendingQualified = 0;
      const jobIds = jobs.docs.map(doc => doc.id);
      
      if (jobIds.length > 0) {
        for (let i = 0; i < jobIds.length; i += 10) {
          const batch = jobIds.slice(i, i + 10);
          const applicants = await db.collection(collections.JOB_APPLICATIONS)
            .where('jobId', 'in', batch)
            .where('qualificationMatch', '>=', 70)
            .where('status', '==', 'pending')
            .get();
          pendingQualified += applicants.size;
        }
      }
      tabCounts.jobs = pendingQualified;
    }

    // STUDENT TAB COUNTS
    if (role === 'student') {
      // Admitted applications
      const admitted = await db.collection(collections.APPLICATIONS)
        .where('studentId', '==', uid)
        .where('status', '==', 'accepted')
        .get();
      tabCounts.applications = admitted.size;

      // Jobs matching student profile
      const studentDoc = await db.collection(collections.USERS).doc(uid).get();
      const student = studentDoc.data();
      
      if (student && student.field) {
        const matchingJobs = await db.collection(collections.JOBS)
          .where('status', '==', 'active')
          .where('field', '==', student.field)
          .get();
        tabCounts.jobs = matchingJobs.size;
      }
    }

    res.json(tabCounts);
  } catch (error) {
    console.error('Get tab notification counts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear notifications for a specific tab
router.post('/clear-tab', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { tab } = req.body;

    if (!tab) {
      return res.status(400).json({ error: 'Tab name required' });
    }

    // Map tab names to notification types for clearing
    const tabToTypeMap = {
      companies: 'company_pending',
      users: 'user_registered',
      transcripts: 'transcript_pending',
      applications: 'application_pending',
      faculties: 'faculty_added',
      courses: 'course_added',
      jobs: 'job_applicant_qualified',
      notifications: 'all'
    };

    const type = tabToTypeMap[tab];
    if (!type) {
      return res.status(400).json({ error: 'Invalid tab name' });
    }

    // Mark notifications as read
    let query = db.collection(collections.NOTIFICATIONS)
      .where('userId', '==', uid)
      .where('read', '==', false);

    if (type !== 'all') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        read: true,
        readAt: new Date()
      });
    });

    await batch.commit();

    console.log(`✅ Cleared ${snapshot.size} notifications for tab: ${tab}`);
    res.json({ 
      success: true,
      cleared: snapshot.size 
    });
  } catch (error) {
    console.error('Clear tab notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark a specific notification as read
router.post('/mark-read/:notificationId', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { notificationId } = req.params;

    const notifRef = db.collection(collections.NOTIFICATIONS).doc(notificationId);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notifDoc.data().userId !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await notifRef.update({
      read: true,
      readAt: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;