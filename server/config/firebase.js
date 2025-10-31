// server/config/firebase.js
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();
const auth = admin.auth();

// Collection names
const collections = {
  USERS: 'users',
  INSTITUTIONS: 'institutions',
  FACULTIES: 'faculties',
  COURSES: 'courses',
  APPLICATIONS: 'applications',
  ADMISSIONS: 'admissions',
  TRANSCRIPTS: 'transcripts',
  JOBS: 'jobs',
  JOB_APPLICATIONS: 'job_applications',
};

module.exports = { db, auth, collections, admin };