import React, { useState, useEffect, useCallback } from 'react';
import StudentLanding from './StudentLanding';
import TranscriptUploadModal from '../components/TranscriptUploadModal';
import CVUploadModal from '../components/CVUploadModal';
import { studentAPI } from '../utils/api';
import { useTabNotifications } from '../hooks/useTabNotifications';
import NotificationBadge from '../components/NotificationBadge';
import { 
  FaGraduationCap, 
  FaBriefcase, 
  FaFileUpload, 
  FaEye, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock,
  FaUser,
  FaBell,
  FaFile,
  FaSearch,
  FaTrophy,
  FaEdit,
  FaFilter
} from 'react-icons/fa';
import axios from 'axios';
import '../styles/StudentDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [uploadContext, setUploadContext] = useState('transcript'); // 'transcript' or 'cv'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobInterest, setJobInterest] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [jobPreferences, setJobPreferences] = useState({
    industries: [],
    jobTypes: [],
    skills: [],
    workType: [],
    salaryMin: '',
    salaryMax: '',
    location: ''
  });
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [institutionsSubTab, setInstitutionsSubTab] = useState('all-institutions'); // 'all-institutions' or 'qualified-institutions'
  const [qualifiedInstitutions, setQualifiedInstitutions] = useState([]);

  // Tab notifications
  const { tabNotifications, clearTabNotification } = useTabNotifications(user?.role || 'student', user?.uid);

  // Clear tab notifications when tab is opened
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      clearTabNotification(activeTab);
    }
  }, [activeTab, clearTabNotification]);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'institutions') {
        const data = await studentAPI.getInstitutions();
        // Sort alphabetically
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setInstitutions(sorted);
      } else if (activeTab === 'my-applications') {
        const data = await studentAPI.getApplications();
        setApplications(data);
      } else if (activeTab === 'jobs') {
        const data = await studentAPI.getJobs();
        setJobs(data);
      } else if (activeTab === 'my-jobs') {
        const data = await studentAPI.getJobApplications();
        setJobApplications(data);
      } else if (activeTab === 'profile') {
        const data = await studentAPI.getProfile();
        setProfile(data);
      } else if (activeTab === 'notifications') {
        const data = await studentAPI.getNotifications();
        setNotifications(data);
      } else if (activeTab === 'job-interests') {
        const data = await studentAPI.getJobPreferences();
        if (data) {
          setJobPreferences(data);
        }
      } else if (activeTab === 'my-transcript') {
        const data = await studentAPI.getProfile();
        setProfile(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load notifications count and mark as read when tab opens
  useEffect(() => {
    const loadNotificationsCount = async () => {
      try {
        const data = await studentAPI.getNotifications();
        const unread = data.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    
    loadNotificationsCount();

    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(loadNotificationsCount, 30000);

    return () => clearInterval(interval);
  }, []);

  // Mark notifications as read when tab is opened
  useEffect(() => {
    if (activeTab === 'notifications' && unreadCount > 0) {
      const markAsRead = async () => {
        try {
          await studentAPI.markAllNotificationsAsRead();
          setUnreadCount(0);
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      };
      
      // Delay marking as read by 1 second to ensure user sees them
      const timeout = setTimeout(markAsRead, 1000);
      return () => clearTimeout(timeout);
    }
  }, [activeTab, unreadCount]);

  // Debug: Log whenever courses state changes
  useEffect(() => {
    const filtered = courses.filter(course => 
      (filterLevel === 'all' || course.level === filterLevel) &&
      (searchTerm === '' || course.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    console.log('🎓 COURSES STATE CHANGED');
    console.log('  Total courses in state:', courses.length);
    console.log('  Selected faculty:', selectedFaculty?.name || 'None');
    console.log('  Modal type:', modalType);
    console.log('  Search term:', searchTerm);
    console.log('  Filter level:', filterLevel);
    console.log('  Filtered courses:', filtered.length);
    console.log('  Full courses array:', courses);
    console.log('  Filtered courses array:', filtered);
  }, [courses, selectedFaculty, modalType, searchTerm, filterLevel]);

  const handleViewCourses = async (institution) => {
    setSelectedInstitution(institution);
    setSelectedFaculty(null);
    try {
      const facultyData = await studentAPI.getInstitutionFaculties(institution.id);
      console.log(`Fetched ${facultyData.length} faculties for institution:`, institution.name, facultyData);
      setFaculties(facultyData);
      setModalType('view-faculties');
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching faculties:', err);
      setError(err.message);
    }
  };

  const loadQualifiedInstitutions = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/student/qualified-institutions`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      // Sort alphabetically
      const sorted = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setQualifiedInstitutions(sorted);
    } catch (err) {
      console.error('Error loading qualified institutions:', err);
      setError('Failed to load qualified institutions');
    }
  };

  const handleSelectFaculty = async (faculty) => {
    console.log('🔵 handleSelectFaculty called with:', faculty);
    setSelectedFaculty(faculty);
    setSearchTerm('');
    setFilterLevel('all');
    setCourses([]); // Reset courses while loading
    try {
      console.log('📡 Fetching courses from API...');
      console.log('📍 Institution ID:', selectedInstitution.id);
      console.log('📍 Faculty ID:', faculty.id);
      
      const courseData = await studentAPI.getFacultyCourses(selectedInstitution.id, faculty.id);
      
      console.log('✅ API Response received');
      console.log('📊 Courses returned:', courseData.length);
      console.log('📋 Course details:', courseData);
      
      if (!courseData || courseData.length === 0) {
        console.warn('⚠️  WARNING: API returned empty or null');
      }
      
      setCourses(courseData || []);
      setModalType('view-courses');
    } catch (err) {
      console.error('❌ Error fetching courses:', err);
      console.error('Error message:', err.message);
      console.error('Full error object:', err);
      setError(err.message);
      setCourses([]);
    }
  };

  const handleApplyCourse = async (course) => {
    try {
      await studentAPI.applyForCourse({
        institutionId: selectedInstitution.id,
        courseId: course.id,
        documents: []
      });
      setSuccess('Application submitted successfully!');
      setShowModal(false);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      console.error('Application error:', err);
      // Extract detailed error message from response if available
      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit application';
      const errorDetails = err.response?.data?.message || err.response?.data?.reason || '';
      const fullError = errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage;
      setError(fullError);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSelectInstitution = async (applicationId) => {
    if (!window.confirm('Are you sure you want to select this institution? This will reject all other admissions.')) {
      return;
    }
    
    try {
      await studentAPI.selectInstitution(applicationId);
      setSuccess('Institution selected successfully! Other applications have been rejected.');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleApplyJob = async (job) => {
    setSelectedJob(job);
    setModalType('upload-cv');
    setUploadContext('cv');
    setShowModal(true);
  };

  // Handle CV upload for job applications
  const handleJobCVUpload = async (formData) => {
    try {
      setIsUploading(true);
      setError('');
      setSuccess('');
      
      // Extract metadata from formData to pass to applyForJob
      const cvMethod = formData.get('cvMethod');
      const coverLetter = formData.get('coverLetter');
      const supportingDocsCount = parseInt(formData.get('supportingDocsCount')) || 0;

      // Call the job application endpoint
      const result = await studentAPI.applyForJob(selectedJob.id, formData);
      
      setSuccess('Job application submitted successfully!');
      setShowModal(false);
      setIsUploading(false);

      setTimeout(() => {
        loadData();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setIsUploading(false);
    }
  };

  const handleSubmitJobApplication = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const applicationData = {
        coverLetter: formData.get('coverLetter') || '',
        cvUrl: formData.get('cvUrl') || '',
        documents: []
      };

      // Validate CV URL
      if (!applicationData.cvUrl.trim()) {
        setError('Please provide a CV URL or upload your CV');
        return;
      }

      await studentAPI.applyForJob(selectedJob.id, applicationData);
      setSuccess('Job application submitted successfully!');
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profileData = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      qualifications: formData.get('qualifications').split(',').map(q => q.trim()),
      workExperience: formData.get('workExperience') ? [{
        company: formData.get('company'),
        position: formData.get('position'),
        duration: formData.get('duration')
      }] : []
    };

    try {
      await studentAPI.updateProfile(profileData);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSaveJobPreferences = async (e) => {
    e.preventDefault();
    try {
      await studentAPI.saveJobPreferences(jobPreferences);
      setSuccess('Job preferences saved successfully! We will match you with relevant opportunities.');
      setTimeout(() => setSuccess(''), 3000);
      setIsEditingPreferences(false);
      loadData();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  
  const handleTranscriptUpload = async (formData) => {
    try {
      setIsUploading(true);
      setError('');
      setSuccess('');
      
      const result = await studentAPI.uploadTranscript(formData);
      
      setSuccess(result.message);
      setShowModal(false);
      setIsUploading(false);

      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'admitted':
        return <FaCheckCircle className="status-icon success" />;
      case 'rejected':
        return <FaTimesCircle className="status-icon danger" />;
      case 'waitlisted':
        return <FaClock className="status-icon warning" />;
      case 'hired':
        return <FaTrophy className="status-icon success" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'Pending Review',
      admitted: 'Admitted',
      rejected: 'Rejected',
      waitlisted: 'Wait-listed',
      hired: 'Hired',
      reviewing: 'Under Review'
    };
    return statusMap[status] || status;
  };

  // Filter institutions with search
  const filteredInstitutions = institutions.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter courses
  const filteredCourses = courses.filter(course => 
    (filterLevel === 'all' || course.level === filterLevel) &&
    (searchTerm === '' || course.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter jobs by interest
  const filteredJobs = jobs.filter(job => {
    const matchesInterest = jobInterest === 'all' || 
      job.title.toLowerCase().includes(jobInterest.toLowerCase()) ||
      job.qualifications?.toLowerCase().includes(jobInterest.toLowerCase());
    
    const matchesSearch = searchTerm === '' ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesInterest && matchesSearch;
  });

  // Get unique job categories for filter
  const jobCategories = ['all', ...new Set(jobs.map(job => {
    const title = job.title.toLowerCase();
    if (title.includes('engineer')) return 'engineering';
    if (title.includes('developer') || title.includes('programmer')) return 'technology';
    if (title.includes('manager') || title.includes('director')) return 'management';
    if (title.includes('sales') || title.includes('marketing')) return 'sales & marketing';
    if (title.includes('accountant') || title.includes('finance')) return 'finance';
    if (title.includes('teacher') || title.includes('lecturer')) return 'education';
    if (title.includes('nurse') || title.includes('doctor')) return 'healthcare';
    return 'other';
  }))];

  const getApplicationCount = (institutionId) => {
    return applications.filter(app => app.institutionId === institutionId).length;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          <FaGraduationCap /> Dashboard
        </button>
        <button
          className={activeTab === 'institutions' ? 'active' : ''}
          onClick={() => {
            setActiveTab('institutions');
            setUploadContext('transcript');
          }}
        >
          <FaGraduationCap /> Browse Institutions
          {tabNotifications?.institutions > 0 && (
            <NotificationBadge count={tabNotifications.institutions} variant="info" />
          )}
        </button>
        <button
          className={activeTab === 'my-applications' ? 'active' : ''}
          onClick={() => setActiveTab('my-applications')}
        >
          <FaEye /> My Applications
          {tabNotifications?.['my-applications'] > 0 && (
            <NotificationBadge count={tabNotifications['my-applications']} variant="success" />
          )}
        </button>
        <button
          className={activeTab === 'jobs' ? 'active' : ''}
          onClick={() => {
            setActiveTab('jobs');
            setUploadContext('cv');
          }}
        >
          <FaBriefcase /> Browse Jobs
        </button>
        <button
          className={activeTab === 'my-jobs' ? 'active' : ''}
          onClick={() => setActiveTab('my-jobs')}
        >
          <FaFileUpload /> My Job Applications
        </button>
        <button
          className={activeTab === 'my-transcript' ? 'active' : ''}
          onClick={() => setActiveTab('my-transcript')}
        >
          <FaFile /> My Transcript
        </button>
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser /> My Profile
        </button>
        <button
          className={activeTab === 'job-interests' ? 'active' : ''}
          onClick={() => setActiveTab('job-interests')}
        >
          <FaBriefcase /> Job Interests
          {tabNotifications?.['job-interests'] > 0 && (
            <NotificationBadge count={tabNotifications['job-interests']} variant="warning" />
          )}
        </button>
        <button
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          <FaBell /> Notifications
          {tabNotifications?.notifications > 0 && (
            <NotificationBadge count={tabNotifications.notifications} variant="warning" />
          )}
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Student Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {success && (
          <div className="success-message">
            {success}
            <button onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        {/* DASHBOARD LANDING PAGE */}
        {activeTab === 'dashboard' && (
          <StudentLanding user={user} onNavigate={setActiveTab} />
        )}

        {/* BROWSE INSTITUTIONS TAB */}
        {activeTab === 'institutions' && (
          <>
            {/* Sub-tabs for Institutions Section */}
            <div className="institutions-subtabs" style={{
              display: 'flex',
              gap: '1rem',
              borderBottom: '2px solid #e5e7eb',
              marginBottom: '2rem',
              paddingBottom: '0'
            }}>
              <button
                onClick={() => setInstitutionsSubTab('all-institutions')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: institutionsSubTab === 'all-institutions' ? '3px solid #2563eb' : 'none',
                  color: institutionsSubTab === 'all-institutions' ? '#2563eb' : '#6b7280',
                  fontWeight: institutionsSubTab === 'all-institutions' ? '600' : '500',
                  fontSize: '15px'
                }}
              >
                <FaGraduationCap style={{ marginRight: '0.5rem' }} /> All Institutions
              </button>
              <button
                onClick={() => {
                  setInstitutionsSubTab('qualified-institutions');
                  loadQualifiedInstitutions();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: institutionsSubTab === 'qualified-institutions' ? '3px solid #2563eb' : 'none',
                  color: institutionsSubTab === 'qualified-institutions' ? '#2563eb' : '#6b7280',
                  fontWeight: institutionsSubTab === 'qualified-institutions' ? '600' : '500',
                  fontSize: '15px'
                }}
              >
                <FaCheckCircle style={{ marginRight: '0.5rem' }} /> Institutions I Qualify For
              </button>
            </div>

            {/* ALL INSTITUTIONS TAB */}
            {institutionsSubTab === 'all-institutions' && (
              <>
                <div className="section-header">
                  <h2>All Higher Learning Institutions</h2>
                  <div className="search-bar">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search institutions by name or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {filteredInstitutions.length === 0 && searchTerm && (
                  <div className="empty-state">
                    <FaSearch size={48} />
                    <h3>No institutions found</h3>
                    <p>Try a different search term</p>
                    <button className="btn-secondary" onClick={() => setSearchTerm('')}>
                      Clear Search
                    </button>
                  </div>
                )}

                {filteredInstitutions.length === 0 && !searchTerm ? (
                  <div className="empty-state">
                    <FaGraduationCap size={48} />
                    <h3>No institutions available</h3>
                    <p>No institutions are currently listed in the system</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {filteredInstitutions.map((inst) => {
                      const appCount = getApplicationCount(inst.id);
                      return (
                        <div key={inst.id} className="institution-card">
                          <h3>{inst.name}</h3>
                          <p><strong>Location:</strong> {inst.location}</p>
                          <p>{inst.description}</p>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '1rem', marginBottom: '1rem' }}>
                            <p style={{ margin: '0.5rem 0' }}>
                              <strong>Faculties:</strong> {inst.facultyCount || 0}
                            </p>
                            <p style={{ margin: '0.5rem 0' }}>
                              <strong>Programs:</strong> {inst.courseCount || 0}
                            </p>
                          </div>
                          <div className="card-footer">
                            <span className="app-count">
                              {appCount}/2 applications used
                            </span>
                            <button 
                              className="btn-primary" 
                              onClick={() => handleViewCourses(inst)}
                              disabled={appCount >= 2}
                            >
                              {appCount >= 2 ? 'Max Applications Reached' : 'View Faculties'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* QUALIFIED INSTITUTIONS TAB */}
            {institutionsSubTab === 'qualified-institutions' && (
              <>
                <div className="section-header">
                  <h2>Institutions I Qualify For</h2>
                  <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                    These are institutions where your qualifications match their course requirements
                  </p>
                </div>

                {qualifiedInstitutions.length === 0 ? (
                  <div className="empty-state">
                    <FaGraduationCap size={48} />
                    <h3>No Matching Institutions</h3>
                    <p>You currently don't qualify for any institutions based on your transcript and qualifications.</p>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setInstitutionsSubTab('all-institutions')}
                    >
                      Browse All Institutions
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      background: '#d1fae5',
                      border: '1px solid #6ee7b7',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      marginBottom: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <FaCheckCircle style={{ color: '#059669', fontSize: '18px' }} />
                      <span style={{ color: '#047857', fontWeight: '500' }}>
                        ✓ Showing {qualifiedInstitutions.length} institution(s) you qualify for
                      </span>
                    </div>

                    <div className="cards-grid">
                      {qualifiedInstitutions.map((inst) => {
                        const appCount = getApplicationCount(inst.id);
                        return (
                          <div key={inst.id} className="institution-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                              <h3 style={{ margin: 0 }}>{inst.name}</h3>
                              <span style={{
                                background: '#d1fae5',
                                color: '#047857',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.375rem',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                ✓ Qualified
                              </span>
                            </div>
                            <p><strong>Location:</strong> {inst.location}</p>
                            <p>{inst.description}</p>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '1rem', marginBottom: '1rem' }}>
                              <p style={{ margin: '0.5rem 0' }}>
                                <strong>Faculties:</strong> {inst.facultyCount || 0}
                              </p>
                              <p style={{ margin: '0.5rem 0' }}>
                                <strong>Matching Programs:</strong> {inst.qualifyingCourseCount || 0}
                              </p>
                            </div>
                            <div className="card-footer">
                              <span className="app-count">
                                {appCount}/2 applications used
                              </span>
                              <button 
                                className="btn-primary" 
                                onClick={() => handleViewCourses(inst)}
                                disabled={appCount >= 2}
                              >
                                {appCount >= 2 ? 'Max Applications Reached' : 'View Faculties'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* MY APPLICATIONS TAB */}
        {activeTab === 'my-applications' && (
          <>
            <div className="section-header">
              <h2>My Course Applications</h2>
              <p className="subtitle">View your admission results and select your institution</p>
            </div>
            
            {applications.length === 0 ? (
              <div className="empty-state">
                <FaGraduationCap size={48} />
                <h3>No Applications Yet</h3>
                <p>Browse institutions and apply for courses to see them here</p>
                <button className="btn-primary" onClick={() => setActiveTab('institutions')}>
                  Browse Institutions
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Applied Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className={app.selected ? 'selected-row' : ''}>
                        <td>{app.institution?.name}</td>
                        <td>{app.course?.name}</td>
                        <td>
                          {getStatusIcon(app.status)}
                          <span className={`status-badge status-${app.status}`}>
                            {getStatusBadge(app.status)}
                          </span>
                          {app.selected && <span className="selected-badge">SELECTED</span>}
                        </td>
                        <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                        <td>
                          {app.status === 'admitted' && !app.selected && (
                            <button 
                              className="btn-success btn-sm"
                              onClick={() => handleSelectInstitution(app.id)}
                            >
                              Select Institution
                            </button>
                          )}
                          {app.selected && (
                            <span className="text-success">Enrolled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* BROWSE JOBS TAB */}
        {activeTab === 'jobs' && (
          <>
            <div className="section-header">
              <h2>Available Job Opportunities</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaFilter style={{ color: '#667eea' }} />
                  <select
                    value={jobInterest}
                    onChange={(e) => setJobInterest(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Categories</option>
                    {jobCategories.slice(1).map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="search-bar" style={{ flex: 1 }}>
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search jobs by title, company, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {!profile?.isGraduate && (
              <div className="info-banner">
                <FaFile />
                <div>
                  <strong>Upload Your CV to Apply for Jobs</strong>
                  <p>You need a CV URL to apply for job positions. You can use Google Drive, Dropbox, or your portfolio.</p>
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setUploadContext('cv');
                      setModalType('upload-cv');
                      setShowModal(true);
                    }}
                  >
                    Upload CV
                  </button>
                </div>
              </div>
            )}

            {filteredJobs.length === 0 && (
              <div className="empty-state">
                <FaBriefcase size={48} />
                <h3>No jobs found in this category</h3>
                <p>Try selecting a different category or clearing your search</p>
                <button className="btn-secondary" onClick={() => {
                  setJobInterest('all');
                  setSearchTerm('');
                }}>
                  Clear Filters
                </button>
              </div>
            )}

            <div className="cards-grid">
              {filteredJobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div className="job-header">
                    <h3>{job.title}</h3>
                    {job.qualificationMatch && (
                      <span className="match-badge">
                        {job.qualificationMatch}% Match
                      </span>
                    )}
                  </div>
                  <p><strong>Company:</strong> {job.company}</p>
                  <p><strong>Location:</strong> {job.location}</p>
                  <p><strong>Salary:</strong> {job.salary}</p>
                  <p><strong>Requirements:</strong> {job.qualifications}</p>
                  <p className="job-description">{job.description}</p>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleApplyJob(job)}
                    disabled={!profile?.isGraduate}
                  >
                    {profile?.isGraduate ? 'Apply Now' : 'Upload Transcript First'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MY JOB APPLICATIONS TAB */}
        {activeTab === 'my-jobs' && (
          <>
            <div className="section-header">
              <h2>My Job Applications</h2>
            </div>
            
            {jobApplications.length === 0 ? (
              <div className="empty-state">
                <FaBriefcase size={48} />
                <h3>No Job Applications Yet</h3>
                <p>Browse available jobs and apply to see them here</p>
                <button className="btn-primary" onClick={() => setActiveTab('jobs')}>
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Applied Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobApplications.map((app) => (
                      <tr key={app.id}>
                        <td>{app.job?.title}</td>
                        <td>{app.job?.company}</td>
                        <td>
                          {getStatusIcon(app.status)}
                          <span className={`status-badge status-${app.status}`}>
                            {getStatusBadge(app.status)}
                          </span>
                        </td>
                        <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                        <td>
                          <button className="btn-secondary btn-sm">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* MY TRANSCRIPT TAB */}
        {activeTab === 'my-transcript' && profile && (
          <>
            <div className="section-header">
              <h2>My Academic Transcript</h2>
              {profile.isGraduate && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setModalType('upload-transcript');
                    setShowModal(true);
                  }}
                >
                  <FaEdit /> Update Transcript
                </button>
              )}
            </div>

            {!profile.isGraduate ? (
              <div className="empty-state">
                <FaFile size={48} />
                <h3>No Transcript Uploaded</h3>
                <p>You need a transcript to apply for courses at institutions. For job applications, only a CV is required.</p>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setModalType('upload-transcript');
                    setShowModal(true);
                  }}
                >
                  <FaFileUpload /> Upload Transcript
                </button>
              </div>
            ) : (
              <div className="profile-container">
                <div className="info-card">
                  <h3>Transcript Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Graduation Year:</strong>
                      <span>{profile.transcript?.graduationYear || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Overall Percentage:</strong>
                      <span>{profile.transcript?.overallPercentage || profile.overallPercentage || 'N/A'}%</span>
                    </div>
                    <div className="info-item">
                      <strong>Verification Status:</strong>
                      <span className={profile.transcriptVerified ? 'text-success' : 'text-warning'}>
                        {profile.transcriptVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Transcript File:</strong>
                      <a href={profile.transcript?.transcriptUrl} target="_blank" rel="noopener noreferrer">
                        View Document
                      </a>
                    </div>
                  </div>
                </div>

                {profile.transcript?.subjects && profile.transcript.subjects.length > 0 && (
                  <div className="info-card">
                    <h3>Subjects and Grades</h3>
                    <div className="subjects-grid">
                      {profile.transcript.subjects.map((subject, index) => (
                        <div key={index} className="subject-item">
                          <strong>{subject.subject}</strong>
                          <span className="grade-badge">{subject.grade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile.transcript?.certificates && profile.transcript.certificates.length > 0 && (
                  <div className="info-card">
                    <h3>Additional Certificates</h3>
                    <ul className="certificates-list">
                      {profile.transcript.certificates.map((cert, index) => (
                        <li key={index}>
                          <a href={cert} target="_blank" rel="noopener noreferrer">
                            Certificate {index + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.transcript?.extraCurricularActivities && profile.transcript.extraCurricularActivities.length > 0 && (
                  <div className="info-card">
                    <h3>Extra-Curricular Activities</h3>
                    <ul className="activities-list">
                      {profile.transcript.extraCurricularActivities.map((activity, index) => (
                        <li key={index}>{activity}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && profile && (
          <>
            <h2>My Profile</h2>
            <div className="profile-container">
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" defaultValue={profile.name} required />
                </div>
                <div className="form-group">
                  <label>Email (cannot be changed)</label>
                  <input type="email" value={profile.email} disabled />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" defaultValue={profile.phone} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea name="address" defaultValue={profile.address} rows="3" />
                </div>
                <div className="form-group">
                  <label>Qualifications (comma-separated)</label>
                  <input 
                    type="text" 
                    name="qualifications" 
                    defaultValue={profile.qualifications?.join(', ')}
                    placeholder="e.g., High School Diploma, Bachelor's Degree"
                  />
                </div>
                
                <h3>Work Experience (Optional)</h3>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" name="company" />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input type="text" name="position" />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input type="text" name="duration" placeholder="e.g., 2020-2022" />
                </div>

                {profile.isGraduate && (
                  <div className="graduate-badge">
                    <FaCheckCircle /> Verified Graduate
                  </div>
                )}

                <button type="submit" className="btn-primary">
                  Update Profile
                </button>
              </form>
            </div>
          </>
        )}

        {/* JOB INTERESTS TAB */}
        {activeTab === 'job-interests' && (
          <>
            <div className="section-header">
              <h2>Job Interests & Preferences</h2>
              <p className="subtitle">Help us match you with relevant job opportunities</p>
              <button 
                className="btn-primary" 
                onClick={() => setIsEditingPreferences(!isEditingPreferences)}
              >
                {isEditingPreferences ? 'Cancel' : 'Edit Preferences'}
              </button>
            </div>

            {isEditingPreferences ? (
              <div className="preferences-form">
                <form onSubmit={handleSaveJobPreferences}>
                  <div className="form-section">
                    <h3>Industries of Interest</h3>
                    <div className="checkbox-group">
                      {['Technology', 'Finance', 'Healthcare', 'Education', 'Marketing', 'Engineering', 'Retail', 'Manufacturing', 'Other'].map(industry => (
                        <label key={industry}>
                          <input
                            type="checkbox"
                            checked={jobPreferences.industries.includes(industry)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setJobPreferences({
                                  ...jobPreferences,
                                  industries: [...jobPreferences.industries, industry]
                                });
                              } else {
                                setJobPreferences({
                                  ...jobPreferences,
                                  industries: jobPreferences.industries.filter(i => i !== industry)
                                });
                              }
                            }}
                          />
                          {industry}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Job Types</h3>
                    <div className="checkbox-group">
                      {['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'].map(jobType => (
                        <label key={jobType}>
                          <input
                            type="checkbox"
                            checked={jobPreferences.jobTypes.includes(jobType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setJobPreferences({
                                  ...jobPreferences,
                                  jobTypes: [...jobPreferences.jobTypes, jobType]
                                });
                              } else {
                                setJobPreferences({
                                  ...jobPreferences,
                                  jobTypes: jobPreferences.jobTypes.filter(j => j !== jobType)
                                });
                              }
                            }}
                          />
                          {jobType}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Work Type</h3>
                    <div className="checkbox-group">
                      {['Remote', 'On-site', 'Hybrid'].map(workType => (
                        <label key={workType}>
                          <input
                            type="checkbox"
                            checked={jobPreferences.workType.includes(workType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setJobPreferences({
                                  ...jobPreferences,
                                  workType: [...jobPreferences.workType, workType]
                                });
                              } else {
                                setJobPreferences({
                                  ...jobPreferences,
                                  workType: jobPreferences.workType.filter(w => w !== workType)
                                });
                              }
                            }}
                          />
                          {workType}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Key Skills</h3>
                    <input
                      type="text"
                      placeholder="Enter skills (comma-separated): e.g., Python, Project Management, Data Analysis"
                      value={jobPreferences.skills.join(', ')}
                      onChange={(e) => {
                        setJobPreferences({
                          ...jobPreferences,
                          skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                        });
                      }}
                    />
                  </div>

                  <div className="form-section">
                    <h3>Salary Range (Optional)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <input
                        type="number"
                        placeholder="Minimum salary"
                        value={jobPreferences.salaryMin}
                        onChange={(e) => setJobPreferences({ ...jobPreferences, salaryMin: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Maximum salary"
                        value={jobPreferences.salaryMax}
                        onChange={(e) => setJobPreferences({ ...jobPreferences, salaryMax: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Preferred Location</h3>
                    <input
                      type="text"
                      placeholder="e.g., Maseru, Lesotho or Remote"
                      value={jobPreferences.location}
                      onChange={(e) => setJobPreferences({ ...jobPreferences, location: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" className="btn-primary">Save Preferences</button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => setIsEditingPreferences(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="preferences-display">
                <div className="preference-card">
                  <h3>Industries</h3>
                  {jobPreferences.industries.length > 0 ? (
                    <div className="tags">
                      {jobPreferences.industries.map(industry => (
                        <span key={industry} className="tag">{industry}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="placeholder">Not specified</p>
                  )}
                </div>

                <div className="preference-card">
                  <h3>Job Types</h3>
                  {jobPreferences.jobTypes.length > 0 ? (
                    <div className="tags">
                      {jobPreferences.jobTypes.map(jobType => (
                        <span key={jobType} className="tag">{jobType}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="placeholder">Not specified</p>
                  )}
                </div>

                <div className="preference-card">
                  <h3>Work Type</h3>
                  {jobPreferences.workType.length > 0 ? (
                    <div className="tags">
                      {jobPreferences.workType.map(workType => (
                        <span key={workType} className="tag">{workType}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="placeholder">Not specified</p>
                  )}
                </div>

                <div className="preference-card">
                  <h3>Skills</h3>
                  {jobPreferences.skills.length > 0 ? (
                    <div className="tags">
                      {jobPreferences.skills.map(skill => (
                        <span key={skill} className="tag">{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="placeholder">Not specified</p>
                  )}
                </div>

                <div className="preference-card">
                  <h3>Salary Range</h3>
                  {jobPreferences.salaryMin || jobPreferences.salaryMax ? (
                    <p>${jobPreferences.salaryMin || '0'} - ${jobPreferences.salaryMax || 'Not specified'}</p>
                  ) : (
                    <p className="placeholder">Not specified</p>
                  )}
                </div>

                <div className="preference-card">
                  <h3>Preferred Location</h3>
                  {jobPreferences.location ? (
                    <p>{jobPreferences.location}</p>
                  ) : (
                    <p className="placeholder">Not specified</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <>
            <div className="section-header">
              <h2>Notifications</h2>
              <p className="subtitle">Stay updated with your application status and job opportunities</p>
            </div>
            
            {notifications.length === 0 ? (
              <div className="empty-state">
                <FaBell size={48} />
                <h3>No Notifications</h3>
                <p>You'll see notifications here when there are updates</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
                    <div className="notification-icon">
                      {notif.type === 'admission' && <FaGraduationCap />}
                      {notif.type === 'job' && <FaBriefcase />}
                      {notif.type === 'general' && <FaBell />}
                    </div>
                    <div className="notification-content">
                      <h4>{notif.title}</h4>
                      <p>{notif.message}</p>
                      <span className="notification-time">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MODALS */}
        
        {/* VIEW FACULTIES MODAL */}
        {showModal && modalType === 'view-faculties' && (
          (() => {
            console.log('🏫 RENDERING FACULTIES MODAL');
            console.log('  Faculties count:', faculties.length);
            console.log('  Faculties data:', faculties);
            return (
              <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                  <h2>Faculties at {selectedInstitution?.name}</h2>
                  <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Select a faculty to view available courses</p>
                  
                  <div className="faculties-list">
                    {faculties && faculties.length > 0 ? (
                      faculties.map((faculty) => (
                        <div key={faculty.id} className="faculty-card">
                          <h3>{faculty.name}</h3>
                          {faculty.description && <p>{faculty.description}</p>}
                          <button 
                            className="btn-primary" 
                            onClick={() => handleSelectFaculty(faculty)}
                          >
                            View Courses
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', color: '#9ca3af' }}>No faculties found</p>
                    )}
                  </div>
                  
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            );
          })()
        )}
        
        {/* VIEW COURSES MODAL */}
        {showModal && modalType === 'view-courses' && (
          (() => {
            console.log('RENDERING COURSES MODAL');
            console.log('  Selected faculty:', selectedFaculty?.name);
            console.log('  Total courses in state:', courses.length);
            console.log('  Courses array:', courses);
            console.log('  Filter level:', filterLevel);
            console.log('  Search term:', searchTerm);
            console.log('  Filtered courses count:', filteredCourses.length);
            console.log('  Filtered courses:', filteredCourses);
            return (
              <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ marginBottom: '0.5rem' }}>Courses in {selectedFaculty?.name}</h2>
                    <p style={{ color: '#6b7280', margin: 0 }}>
                      {courses.length} available course{courses.length !== 1 ? 's' : ''} - Select a course to apply
                    </p>
                  </div>
                  
                  <div className="modal-filters">
                    <div className="search-bar">
                      <FaSearch />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select 
                      value={filterLevel} 
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Levels</option>
                      <option value="Certificate">Certificate</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Degree">Degree</option>
                      <option value="Masters">Masters</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </div>

                  <div className="courses-list">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <div key={course.id} className={`course-item ${!course.eligible ? 'not-eligible' : ''}`}>
                      <h3>{course.name}</h3>
                      <p><strong>Faculty:</strong> {course.faculty?.name}</p>
                      <p><strong>Duration:</strong> {course.duration}</p>
                      <p><strong>Level:</strong> {course.level}</p>
                      <p>{course.description}</p>
                      
                      {course.isGeneralCourse && (
                        <div style={{
                          padding: '10px',
                          backgroundColor: '#e8f5e9',
                          borderLeft: '4px solid #4caf50',
                          marginBottom: '10px',
                          borderRadius: '4px'
                        }}>
                          <strong style={{ color: '#2e7d32' }}>General Course</strong>
                          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#558b2f' }}>
                            No specific subjects required - everyone can apply!
                          </p>
                        </div>
                      )}
                      
                      {!course.eligible && (
                        <div className="eligibility-warning">
                          <FaTimesCircle style={{ color: '#e74c3c' }} />
                          <div>
                            <strong>Not Eligible</strong>
                            <p>{course.eligibilityReason}</p>
                            <small>Required: {course.requiredQualification}</small>
                            <small>Your qualifications: {course.yourQualifications || 'None listed'}</small>
                          </div>
                        </div>
                      )}
                      
                      {course.eligible && (
                        <div className="eligibility-success">
                          <FaCheckCircle style={{ color: '#27ae60' }} />
                          <span>{course.eligibilityReason}</span>
                        </div>
                      )}
                      
                      <button 
                        className="btn-primary" 
                        onClick={() => handleApplyCourse(course)}
                        disabled={!course.eligible}
                      >
                        {course.eligible ? 'Apply for this Course' : 'Not Eligible to Apply'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                      {courses.length === 0 ? 'Loading courses...' : `No courses found matching filters`}
                    </p>
                    <small style={{ display: 'block', marginTop: '10px', fontSize: '12px' }}>
                      (Total courses: {courses.length}, Filtered: {filteredCourses.length})
                    </small>
                    <small>Try adjusting your search or filter to see more courses</small>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button className="btn-secondary" onClick={() => {
                  setSelectedFaculty(null);
                  setCourses([]);
                  setSearchTerm('');
                  setFilterLevel('all');
                  setModalType('view-faculties');
                }}>
                  ← Back to Faculties
                </button>
                <button className="btn-secondary" onClick={() => {
                  setShowModal(false);
                  setSelectedFaculty(null);
                  setCourses([]);
                  setSearchTerm('');
                  setFilterLevel('all');
                }}>
                  Close
                </button>
              </div>
            </div>
          </div>
            );
          })()
        )}

        {/* APPLY FOR JOB MODAL */}
        {/* OLD APPLY JOB MODAL - NOW REPLACED BY CVUploadModal */}
        {/* Job applications now use CVUploadModal when uploadContext='cv' */}

        {/* UPLOAD TRANSCRIPT MODAL */}
        {showModal && modalType === 'upload-transcript' && (
          <TranscriptUploadModal
            onClose={() => setShowModal(false)}
            onSubmit={handleTranscriptUpload}
          />
        )}

        {/* UPLOAD CV MODAL */}
        {showModal && modalType === 'upload-cv' && (
          <CVUploadModal
            onClose={() => setShowModal(false)}
            onSubmit={uploadContext === 'cv' ? handleJobCVUpload : handleTranscriptUpload}
          />
        )}

      </div>
    </div>
  );
}