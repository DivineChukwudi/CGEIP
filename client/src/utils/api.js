// client/src/utils/api.js - MERGED & COMPLETE VERSION WITH DELETE USER
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors - redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication failed - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  verifyEmail: async (uid) => {
    const { data } = await api.post('/auth/verify-email', { uid });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// ============================================
// ADMIN API - COMPLETE
// ============================================
export const adminAPI = {
  // Institutions
  getInstitutions: async () => {
    const { data } = await api.get('/admin/institutions');
    return data;
  },

  addInstitution: async (institutionData) => {
    const { data } = await api.post('/admin/institutions', institutionData);
    return data;
  },

  updateInstitution: async (id, institutionData) => {
    const { data } = await api.put(`/admin/institutions/${id}`, institutionData);
    return data;
  },

  deleteInstitution: async (id) => {
    const { data } = await api.delete(`/admin/institutions/${id}`);
    return data;
  },

  // Faculties
  getAllFaculties: async () => {
    const { data } = await api.get('/admin/faculties');
    return data;
  },

  addFaculty: async (facultyData) => {
    const { data } = await api.post('/admin/faculties', facultyData);
    return data;
  },

  updateFaculty: async (id, facultyData) => {
    const { data } = await api.put(`/admin/faculties/${id}`, facultyData);
    return data;
  },

  deleteFaculty: async (id) => {
    const { data } = await api.delete(`/admin/faculties/${id}`);
    return data;
  },

  // Courses
  getAllCourses: async () => {
    const { data } = await api.get('/admin/courses');
    return data;
  },

  addCourse: async (courseData) => {
    const { data } = await api.post('/admin/courses', courseData);
    return data;
  },

  updateCourse: async (id, courseData) => {
    const { data } = await api.put(`/admin/courses/${id}`, courseData);
    return data;
  },

  deleteCourse: async (id) => {
    const { data } = await api.delete(`/admin/courses/${id}`);
    return data;
  },

  // Companies
  getCompanies: async () => {
    const { data } = await api.get('/admin/companies');
    return data;
  },

  updateCompanyStatus: async (id, status) => {
    const { data } = await api.put(`/admin/companies/${id}/status`, { status });
    return data;
  },

  deleteCompany: async (id) => {
    const { data } = await api.delete(`/admin/companies/${id}`);
    return data;
  },

  // Users
  getUsers: async () => {
    const { data } = await api.get('/admin/users');
    return data;
  },

  getAllUsers: async () => {
    const { data } = await api.get('/admin/users');
    return data;
  },

  updateUserStatus: async (userId, status) => {
    const { data } = await api.put(`/admin/users/${userId}/status`, { status });
    return data;
  },

  // Delete user with force parameter for confirmation
  deleteUser: async (userId, force = false) => {
    const url = force ? `/admin/users/${userId}?force=true` : `/admin/users/${userId}`;
    const { data } = await api.delete(url);
    return data;
  },

  // Reports & Statistics
  getReports: async () => {
    const { data } = await api.get('/admin/reports');
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/admin/stats');
    return data;
  },

  // Admissions
  publishAdmissions: async (admissionsData) => {
    const { data } = await api.post('/admin/admissions/publish', admissionsData);
    return data;
  },

  // System Management
  getSystemLogs: async () => {
    const { data } = await api.get('/admin/logs');
    return data;
  },
// Transcript Management
getTranscripts: async () => {
  const { data } = await api.get('/admin/transcripts');
  return data;
},

verifyTranscript: async (transcriptId) => {
  const { data } = await api.put(`/admin/transcripts/${transcriptId}/verify`);
  return data;
},

declineTranscript: async (transcriptId, reason) => {
  const { data } = await api.put(`/admin/transcripts/${transcriptId}/decline`, { reason });
  return data;
},

// Notification
notifyStudent: async (studentId, notification) => {
  const { data } = await api.post('/admin/notify-student', {
    studentId,
    ...notification
  });
  return data;
},
};

// ============================================
// INSTITUTION API - COMPLETE
// ============================================
export const institutionAPI = {
  // Profile
  getProfile: async () => {
    const { data } = await api.get('/institution/profile');
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/institution/profile', profileData);
    return data;
  },

  // Faculties
  getFaculties: async () => {
    const { data } = await api.get('/institution/faculties');
    return data;
  },

  addFaculty: async (facultyData) => {
    const { data } = await api.post('/institution/faculties', facultyData);
    return data;
  },

  createFaculty: async (facultyData) => {
    const { data } = await api.post('/institution/faculties', facultyData);
    return data;
  },

  updateFaculty: async (id, facultyData) => {
    const { data } = await api.put(`/institution/faculties/${id}`, facultyData);
    return data;
  },

  deleteFaculty: async (id) => {
    const { data } = await api.delete(`/institution/faculties/${id}`);
    return data;
  },

  // Courses
  getCourses: async () => {
    const { data } = await api.get('/institution/courses');
    return data;
  },

  addCourse: async (courseData) => {
    const { data } = await api.post('/institution/courses', courseData);
    return data;
  },

  createCourse: async (courseData) => {
    const { data } = await api.post('/institution/courses', courseData);
    return data;
  },

  updateCourse: async (id, courseData) => {
    const { data } = await api.put(`/institution/courses/${id}`, courseData);
    return data;
  },

  deleteCourse: async (id) => {
    const { data } = await api.delete(`/institution/courses/${id}`);
    return data;
  },

  // Applications
  getApplications: async (filters) => {
    const { data } = await api.get('/institution/applications', { params: filters });
    return data;
  },

  updateApplicationStatus: async (id, status, reason) => {
    const { data } = await api.put(`/institution/applications/${id}/status`, {
      status,
      reason,
    });
    return data;
  },

  // Admissions
  publishAdmissions: async (admissionsData) => {
    const { data } = await api.post('/institution/admissions/publish', admissionsData);
    return data;
  },

  getAdmissions: async () => {
    const { data } = await api.get('/institution/admissions');
    return data;
  },

  // Statistics
  getStatistics: async () => {
    const { data } = await api.get('/institution/statistics');
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/institution/stats');
    return data;
  },
};

// ============================================
// STUDENT API - ENHANCED & COMPLETE
// ============================================
export const studentAPI = {
  // Profile Management
  getProfile: async () => {
    const { data } = await api.get('/student/profile');
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/student/profile', profileData);
    return data;
  },

  uploadDocument: async (documentData) => {
    const { data } = await api.post('/student/documents', documentData);
    return data;
  },

  // Institutions & Courses
  getInstitutions: async () => {
    const { data } = await api.get('/student/institutions');
    return data;
  },

  getInstitutionCourses: async (institutionId) => {
    const { data } = await api.get(`/student/institutions/${institutionId}/courses`);
    return data;
  },

  // Course Applications
  applyForCourse: async (applicationData) => {
    const { data } = await api.post('/student/applications', applicationData);
    return data;
  },

  getApplications: async () => {
    const { data } = await api.get('/student/applications');
    return data;
  },

  selectInstitution: async (applicationId) => {
    const { data } = await api.post(`/student/applications/${applicationId}/select`);
    return data;
  },

  // TRANSCRIPT UPLOAD - WITH FILE UPLOAD
  uploadTranscript: async (formData) => {
    const { data } = await api.post('/student/transcripts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },

  getTranscript: async () => {
    const { data } = await api.get('/student/transcripts');
    return data;
  },

  // Job Applications
  getJobs: async () => {
    const { data } = await api.get('/student/jobs');
    return data;
  },

  applyForJob: async (jobId, applicationData) => {
    const { data } = await api.post(`/student/jobs/${jobId}/apply`, applicationData);
    return data;
  },

  getJobApplications: async () => {
    const { data } = await api.get('/student/job-applications');
    return data;
  },

  // Notifications
  getNotifications: async () => {
    const { data } = await api.get('/student/notifications');
    return data;
  },

  markNotificationAsRead: async (notificationId) => {
    const { data } = await api.put(`/student/notifications/${notificationId}/read`);
    return data;
  },

  markAllNotificationsAsRead: async () => {
    const { data } = await api.put('/student/notifications/read-all');
    return data;
  }
};

// ============================================
// COMPANY API - COMPLETE
// ============================================
export const companyAPI = {
  // Profile
  getProfile: async () => {
    const { data } = await api.get('/company/profile');
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/company/profile', profileData);
    return data;
  },

  // Job Postings
  getJobs: async () => {
    const { data } = await api.get('/company/jobs');
    return data;
  },

  postJob: async (jobData) => {
    const { data } = await api.post('/company/jobs', jobData);
    return data;
  },

  createJob: async (jobData) => {
    const { data } = await api.post('/company/jobs', jobData);
    return data;
  },

  updateJob: async (id, jobData) => {
    const { data } = await api.put(`/company/jobs/${id}`, jobData);
    return data;
  },

  deleteJob: async (id) => {
    const { data } = await api.delete(`/company/jobs/${id}`);
    return data;
  },

  // Job Applications & Applicants
  getJobApplicants: async (jobId) => {
    const { data } = await api.get(`/company/jobs/${jobId}/applicants`);
    return data;
  },

  getJobApplications: async (jobId) => {
    const { data } = await api.get(`/company/jobs/${jobId}/applications`);
    return data;
  },

  getAllApplications: async () => {
    const { data } = await api.get('/company/applications');
    return data;
  },

  updateApplicationStatus: async (id, status, feedback) => {
    const { data } = await api.put(`/company/applications/${id}/status`, {
      status,
      feedback,
    });
    return data;
  },

  // Statistics
  getStats: async () => {
    const { data } = await api.get('/company/stats');
    return data;
  },
};

// ============================================
// PUBLIC API
// ============================================
export const publicAPI = {
  getInstitutions: async () => {
    const { data } = await api.get('/public/institutions');
    return data;
  },

  getJobs: async () => {
    const { data } = await api.get('/public/jobs');
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/public/stats');
    return data;
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================
export const notificationsAPI = {
  // Get notification counts
  getCounts: async () => {
    const { data } = await api.get('/notifications/counts');
    return data;
  },

  // Get all notifications
  getAll: async (limit = 50, offset = 0) => {
    const { data } = await api.get('/notifications', {
      params: { limit, offset }
    });
    return data;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const { data } = await api.put(`/notifications/${notificationId}/read`);
    return data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const { data } = await api.put('/notifications/read-all');
    return data;
  },

  // Mark notifications by category as read
  markCategoryAsRead: async (category) => {
    const { data } = await api.put('/notifications/read-by-category', { category });
    return data;
  },

  // Delete notification
  delete: async (notificationId) => {
    const { data } = await api.delete(`/notifications/${notificationId}`);
    return data;
  }
};

// Default export
const apiExport = {
  authAPI,
  adminAPI,
  institutionAPI,
  studentAPI,
  companyAPI,
  publicAPI,
  notificationsAPI,
};

export default apiExport;