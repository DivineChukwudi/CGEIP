const { db, collections } = require('../config/firebase');
const { sendJobPreferenceReminderEmail } = require('../utils/email');

/**
 * Job Preferences Reminder Service
 * Sends reminder notifications to students who haven't filled in their job preferences
 * Runs every 3 hours (configurable)
 * Also sends email reminders to ensure students don't miss notifications
 */

class JobPreferencesReminder {
  constructor(interval = 3 * 60 * 60 * 1000) { // 3 hours default
    this.interval = interval;
    this.isRunning = false;
    this.lastReminders = {}; // Track last reminder time per student
  }

  /**
   * Start the reminder service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Job Preferences Reminder is already running');
      return;
    }

    this.isRunning = true;
    console.log(`✅ Job Preferences Reminder started - checking every ${this.interval / 1000 / 60 / 60} hours`);

    this.scheduleReminder();
  }

  /**
   * Stop the reminder service
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.isRunning = false;
      console.log('🛑 Job Preferences Reminder stopped');
    }
  }

  /**
   * Schedule periodic reminder checks
   */
  scheduleReminder() {
    this.timer = setInterval(async () => {
      try {
        await this.checkAndSendReminders();
      } catch (error) {
        console.error('❌ Error in job preferences reminder:', error);
      }
    }, this.interval);
  }

  /**
   * Check for students without job preferences and send reminders
   */
  async checkAndSendReminders() {
    try {
      const now = new Date();
      console.log(`\n🔔 Job Preferences Reminder Check - ${now.toISOString()}`);

      // Get all active students (registered more than 24 hours ago)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const studentsSnapshot = await db.collection(collections.USERS)
        .where('role', '==', 'student')
        .where('createdAt', '<=', twentyFourHoursAgo.toISOString())
        .get();

      console.log(`📋 Checking ${studentsSnapshot.size} students for job preferences...`);

      let remindersSent = 0;
      const reminderPromises = [];

      for (const studentDoc of studentsSnapshot.docs) {
        const studentId = studentDoc.id;
        const student = studentDoc.data();

        // Check if student already has job preferences
        const preferencesDoc = await db.collection(collections.JOB_PREFERENCES)
          .doc(studentId)
          .get();

        // If student has preferences, skip them
        if (preferencesDoc.exists) {
          const preferences = preferencesDoc.data();
          // Check if preferences are actually filled in (not just empty object)
          const hasActualPreferences = 
            (preferences.industries && preferences.industries.length > 0) ||
            (preferences.jobTypes && preferences.jobTypes.length > 0) ||
            (preferences.skills && preferences.skills.length > 0) ||
            (preferences.workType && preferences.workType.length > 0) ||
            preferences.location ||
            preferences.salaryMin ||
            preferences.salaryMax;

          if (hasActualPreferences) {
            console.log(`   ✓ ${student.name} has job preferences set`);
            continue; // Skip this student
          }
        }

        // Student doesn't have preferences - check if we should send reminder
        const lastReminderTime = this.lastReminders[studentId];
        const now = Date.now();

        // Only send reminder if:
        // 1. We haven't sent one yet, OR
        // 2. More than interval time has passed since last reminder
        if (!lastReminderTime || (now - lastReminderTime) >= this.interval) {
          console.log(`   📢 Sending reminder to ${student.name}`);

          reminderPromises.push(
            this.sendPreferenceReminder(studentId, student)
          );

          this.lastReminders[studentId] = now;
          remindersSent++;
        }
      }

      // Send all reminders
      if (reminderPromises.length > 0) {
        await Promise.all(reminderPromises);
        console.log(`✅ Job Preferences Reminder - Sent ${remindersSent} reminders`);
      } else {
        console.log('✅ Job Preferences Reminder - No reminders needed');
      }

      console.log(`📅 Next check in ${this.interval / 1000 / 60 / 60} hours`);
    } catch (error) {
      console.error('❌ Error checking and sending reminders:', error);
    }
  }

  /**
   * Send job preference reminder notification to a student
   * Also sends email reminder so student gets notified even if they don't log in
   */
  async sendPreferenceReminder(studentId, student) {
    try {
      // Check if there's already an unread preference reminder notification
      const existingReminder = await db.collection(collections.NOTIFICATIONS)
        .where('userId', '==', studentId)
        .where('type', '==', 'job_preference_reminder')
        .where('read', '==', false)
        .limit(1)
        .get();

      // Only create a new notification if there isn't already an unread one
      if (existingReminder.empty) {
        const notificationData = {
          userId: studentId,
          type: 'job_preference_reminder',
          title: '⚙️ Complete Your Job Preferences',
          message: 'Help us match you with the perfect job opportunities! Fill in your job preferences to start receiving personalized job recommendations. Go to "Job Interests" in your dashboard.',
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: '/dashboard/job-interests'
        };

        await db.collection(collections.NOTIFICATIONS).add(notificationData);
        console.log(`   ✓ Reminder notification created for ${student.name}`);
        
        // ===================================
        // SEND EMAIL REMINDER
        // ===================================
        // Send email so student gets notified even if they don't log in to portal
        try {
          if (student.email) {
            await sendJobPreferenceReminderEmail(student.email, student.name);
            console.log(`   ✓ Email reminder sent to ${student.email}`);
          } else {
            console.warn(`   ⚠️ No email found for student ${student.name} (${studentId})`);
          }
        } catch (emailError) {
          // Don't fail the entire reminder if email fails
          // The in-app notification was already created
          console.warn(`   ⚠️ Failed to send email to ${student.email}: ${emailError.message}`);
        }
      } else {
        console.log(`   → ${student.name} already has unread reminder`);
      }
    } catch (error) {
      console.error(`Error sending reminder to student ${studentId}:`, error);
    }
  }

  /**
   * Set the check interval (in milliseconds)
   */
  setInterval(milliseconds) {
    this.interval = milliseconds;
    if (this.isRunning) {
      this.stop();
      this.start();
      console.log(`⚙️ Job Preferences Reminder interval updated to ${milliseconds / 1000 / 60 / 60} hours`);
    }
  }

  /**
   * Get status of the reminder service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: `${this.interval / 1000 / 60 / 60} hours`,
      nextCheck: new Date(Date.now() + this.interval),
      studentsPending: Object.keys(this.lastReminders).length
    };
  }

  /**
   * Manually trigger a reminder check (for testing)
   */
  async triggerManualCheck() {
    console.log('🔧 Triggering manual Job Preferences Reminder check...');
    await this.checkAndSendReminders();
  }
}

module.exports = JobPreferencesReminder;
