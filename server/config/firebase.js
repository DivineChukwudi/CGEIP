const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test connection
db.settings({
  ignoreUndefinedProperties: true,
});

// Collections
const collections = {
  USERS: 'users',
  INSTITUTIONS: 'institutions',
  FACULTIES: 'faculties',
  COURSES: 'courses',
  APPLICATIONS: 'applications',
  COMPANIES: 'companies',
  JOBS: 'jobs',
  JOB_APPLICATIONS: 'job_applications',
  JOB_PREFERENCES: 'job_preferences',
  ADMISSIONS: 'admissions',
  TRANSCRIPTS: 'transcripts',
  NOTIFICATIONS: 'notifications',
  TEAM: 'team',
  REPORTS: 'system_reports'
};

module.exports = { admin, db, auth, collections };