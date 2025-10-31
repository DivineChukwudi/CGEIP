// client/src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: (userData) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (credentials) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  verifyEmail: (uid) =>
    apiCall('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ uid }),
    }),
};

// Admin API
export const adminAPI = {
  getInstitutions: () => apiCall('/admin/institutions'),
  addInstitution: (data) => apiCall('/admin/institutions', { method: 'POST', body: JSON.stringify(data) }),
  updateInstitution: (id, data) => apiCall(`/admin/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInstitution: (id) => apiCall(`/admin/institutions/${id}`, { method: 'DELETE' }),
  
  getCompanies: () => apiCall('/admin/companies'),
  updateCompanyStatus: (id, status) => apiCall(`/admin/companies/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteCompany: (id) => apiCall(`/admin/companies/${id}`, { method: 'DELETE' }),
  
  getUsers: () => apiCall('/admin/users'),
  getReports: () => apiCall('/admin/reports'),
};

// Institution API
export const institutionAPI = {
  getProfile: () => apiCall('/institution/profile'),
  updateProfile: (data) => apiCall('/institution/profile', { method: 'PUT', body: JSON.stringify(data) }),
  
  getFaculties: () => apiCall('/institution/faculties'),
  addFaculty: (data) => apiCall('/institution/faculties', { method: 'POST', body: JSON.stringify(data) }),
  updateFaculty: (id, data) => apiCall(`/institution/faculties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaculty: (id) => apiCall(`/institution/faculties/${id}`, { method: 'DELETE' }),
  
  getCourses: () => apiCall('/institution/courses'),
  addCourse: (data) => apiCall('/institution/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => apiCall(`/institution/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id) => apiCall(`/institution/courses/${id}`, { method: 'DELETE' }),
  
  getApplications: () => apiCall('/institution/applications'),
  updateApplicationStatus: (id, status) => apiCall(`/institution/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  
  publishAdmissions: (data) => apiCall('/institution/admissions/publish', { method: 'POST', body: JSON.stringify(data) }),
};

// Student API
export const studentAPI = {
  getProfile: () => apiCall('/student/profile'),
  updateProfile: (data) => apiCall('/student/profile', { method: 'PUT', body: JSON.stringify(data) }),
  
  getInstitutions: () => apiCall('/student/institutions'),
  getInstitutionCourses: (institutionId) => apiCall(`/student/institutions/${institutionId}/courses`),
  
  applyForCourse: (data) => apiCall('/student/applications', { method: 'POST', body: JSON.stringify(data) }),
  getApplications: () => apiCall('/student/applications'),
  selectInstitution: (id) => apiCall(`/student/applications/${id}/select`, { method: 'POST' }),
  
  uploadTranscript: (data) => apiCall('/student/transcripts', { method: 'POST', body: JSON.stringify(data) }),
  
  getJobs: () => apiCall('/student/jobs'),
  applyForJob: (jobId, data) => apiCall(`/student/jobs/${jobId}/apply`, { method: 'POST', body: JSON.stringify(data) }),
  getJobApplications: () => apiCall('/student/job-applications'),
};

// Company API
export const companyAPI = {
  getProfile: () => apiCall('/company/profile'),
  updateProfile: (data) => apiCall('/company/profile', { method: 'PUT', body: JSON.stringify(data) }),
  
  getJobs: () => apiCall('/company/jobs'),
  postJob: (data) => apiCall('/company/jobs', { method: 'POST', body: JSON.stringify(data) }),
  updateJob: (id, data) => apiCall(`/company/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteJob: (id) => apiCall(`/company/jobs/${id}`, { method: 'DELETE' }),
  
  getJobApplicants: (jobId) => apiCall(`/company/jobs/${jobId}/applicants`),
  updateApplicationStatus: (id, status) => apiCall(`/company/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export default { authAPI, adminAPI, institutionAPI, studentAPI, companyAPI };