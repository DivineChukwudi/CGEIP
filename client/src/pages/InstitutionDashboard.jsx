import React, { useState, useEffect, useCallback } from 'react';
import InstitutionLanding from './InstitutionLanding';
import { institutionAPI } from '../utils/api';
import { FaGraduationCap, FaUsers, FaCheck, FaTimes, FaPlus, FaEdit, FaTrash, FaBook, FaChartBar, FaBullhorn, FaBell, FaEye, FaDownload, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaFileAlt } from 'react-icons/fa';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { useTabNotifications } from '../hooks/useTabNotifications';
import NotificationBadge from '../components/NotificationBadge';
import axios from 'axios';
import '../styles/global.css';

export default function InstitutionDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [studentTranscripts, setStudentTranscripts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NOTIFICATION INTEGRATION
  const { counts, refreshCounts } = useNotificationCounts(user?.role || 'institution', user?.uid);
  const { tabNotifications, clearTabNotification } = useTabNotifications(user?.role || 'institution', user?.uid);

  // Clear tab notifications when tab is opened
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      clearTabNotification(activeTab);
    }
  }, [activeTab, clearTabNotification]);

  const loadData = useCallback(async () => {
    setError('');
    try {
      if (activeTab === 'dashboard') {
        const stats = await institutionAPI.getStatistics();
        setStatistics(stats);
      } else if (activeTab === 'faculties') {
        const data = await institutionAPI.getFaculties();
        setFaculties(data);
      } else if (activeTab === 'courses') {
        const [facData, courseData] = await Promise.all([
          institutionAPI.getFaculties(),
          institutionAPI.getCourses()
        ]);
        setFaculties(facData);
        setCourses(courseData);
      } else if (activeTab === 'applications') {
        const data = await institutionAPI.getApplications();
        setApplications(data);
      } else if (activeTab === 'notifications') {
        const data = await institutionAPI.getNotifications?.() || [];
        setNotifications(data);
      } else if (activeTab === 'profile') {
        const profileData = await institutionAPI.getProfile();
        setProfile(profileData);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ==================== FACULTY MANAGEMENT ====================
  const handleAddFaculty = () => {
    setModalType('add-faculty');
    setEditingItem(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
    setError('');
  };

  const handleEditFaculty = (faculty) => {
    setModalType('edit-faculty');
    setEditingItem(faculty);
    setFormData({ 
      name: faculty.name,
      description: faculty.description
    });
    setShowModal(true);
    setError('');
  };

  const handleSubmitFaculty = async (e) => {
    e.preventDefault();
    // Prevent double submission on React StrictMode double-render
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if (editingItem) {
        await institutionAPI.updateFaculty(editingItem.id, formData);
        showSuccess('Faculty updated successfully!');
      } else {
        await institutionAPI.addFaculty(formData);
        showSuccess('Faculty added successfully!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (id) => {
    if (window.confirm('Delete this faculty? All courses will be removed.')) {
      try {
        await institutionAPI.deleteFaculty(id);
        showSuccess('Faculty deleted successfully!');
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // ==================== COURSE MANAGEMENT ====================
  const handleAddCourse = () => {
    setModalType('add-course');
    setEditingItem(null);
    setFormData({ 
      name: '',
      facultyId: '',
      description: '',
      duration: '',
      requirements: '',
      level: 'Diploma',
      capacity: 50,
      minimumOverallPercentage: 0,
      requiredSubjects: [],
      additionalSubjects: []
    });
    setShowModal(true);
    setError('');
  };

  const handleEditCourse = (course) => {
    setModalType('edit-course');
    setEditingItem(course);
    setFormData({
      name: course.name,
      facultyId: course.facultyId,
      description: course.description,
      duration: course.duration,
      requirements: course.requirements,
      level: course.level,
      capacity: course.capacity,
      minimumOverallPercentage: course.minimumOverallPercentage || 0,
      requiredSubjects: course.requiredSubjects || [],
      additionalSubjects: course.additionalSubjects || []
    });
    setShowModal(true);
    setError('');
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await institutionAPI.updateCourse(editingItem.id, formData);
        showSuccess('Course updated successfully!');
      } else {
        const result = await institutionAPI.addCourse(formData);
        showSuccess('Course added successfully!');
        
        // Save course requirements if specified
        if ((formData.requiredSubjects && formData.requiredSubjects.length > 0) || 
            (formData.additionalSubjects && formData.additionalSubjects.length > 0) ||
            formData.minimumOverallPercentage > 0) {
          try {
            const courseId = result?.id || editingItem?.id;
            if (courseId) {
              await axios.post(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/course-requirements/${courseId}`,
                {
                  requiredSubjects: formData.requiredSubjects || [],
                  additionalSubjects: formData.additionalSubjects || [],
                  minimumOverallPercentage: formData.minimumOverallPercentage || 0,
                  minimumRequiredSubjectsNeeded: formData.requiredSubjects?.length || 0
                },
                {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
              );
              console.log('Course requirements saved successfully');
            }
          } catch (requirementsErr) {
            console.error('Note: Could not save course requirements:', requirementsErr);
            // Don't fail the entire operation if requirements save fails
          }
        }
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (window.confirm('Delete this course?')) {
      try {
        await institutionAPI.deleteCourse(id);
        showSuccess('Course deleted successfully!');
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // ==================== APPLICATION MANAGEMENT ====================
  const handleUpdateApplicationStatus = async (id, status) => {
    try {
      await institutionAPI.updateApplicationStatus(id, status);
      showSuccess(`Application ${status} successfully!`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==================== VIEW APPLICATION DETAILS ====================
  const handleViewApplicationDetails = async (application) => {
    try {
      setSelectedApplication(application);
      setModalType('view-application-details');
      setShowModal(true);
      setError('');
      
      // Fetch student transcripts and certificates
      const token = localStorage.getItem('token');
      if (!token || !application.studentId) return;
      
      try {
        const { data: transcripts } = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/transcripts?studentId=${application.studentId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setStudentTranscripts(transcripts || []);
      } catch (transcriptErr) {
        console.warn('Could not load transcripts:', transcriptErr);
        setStudentTranscripts([]);
      }
    } catch (err) {
      console.error('Error loading application details:', err);
      setError('Could not load application documents');
    }
  };

  // ==================== PUBLISH ADMISSIONS ====================
  const handlePublishAdmissions = () => {
    setModalType('publish-admissions');
    setFormData({
      title: '',
      message: '',
      deadline: ''
    });
    setShowModal(true);
    setError('');
  };

  const handleSubmitAdmissions = async (e) => {
    e.preventDefault();
    try {
      await institutionAPI.publishAdmissions(formData);
      showSuccess('Admission announcement published successfully!');
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // ==================== PROFILE MANAGEMENT ====================
  const handleEditProfile = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        location: profile.location || '',
        phone: profile.phone || '',
        website: profile.website || '',
        description: profile.description || ''
      });
    }
    setModalType('edit-profile');
    setShowModal(true);
    setError('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await institutionAPI.updateProfile(formData);
      showSuccess('Profile updated successfully!');
      setShowModal(false);
      setFormData({});
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          <FaChartBar /> Dashboard
        </button>
        
        <button
          className={activeTab === 'faculties' ? 'active' : ''}
          onClick={() => setActiveTab('faculties')}
        >
          <FaGraduationCap /> Faculties
          {tabNotifications?.faculties > 0 && (
            <NotificationBadge count={tabNotifications.faculties} variant="info" />
          )}
        </button>
        
        <button
          className={activeTab === 'courses' ? 'active' : ''}
          onClick={() => setActiveTab('courses')}
        >
          <FaBook /> Courses
          {tabNotifications?.courses > 0 && (
            <NotificationBadge count={tabNotifications.courses} variant="info" />
          )}
        </button>
        
        <button
          className={activeTab === 'applications' ? 'active' : ''}
          onClick={() => setActiveTab('applications')}
        >
          <FaUsers /> Applications
          {tabNotifications?.applications > 0 && (
            <NotificationBadge count={tabNotifications.applications} variant="warning" />
          )}
        </button>
        
        <button
          className={activeTab === 'admissions' ? 'active' : ''}
          onClick={() => setActiveTab('admissions')}
        >
          <FaBullhorn /> Publish Admissions
        </button>

        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser /> Update Profile
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
          <h1>Institution Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* ==================== DASHBOARD LANDING PAGE ==================== */}
        {activeTab === 'dashboard' && (
          <InstitutionLanding user={user} onNavigate={setActiveTab} />
        )}

        {/* ==================== FACULTIES TAB ==================== */}
        {activeTab === 'faculties' && (
          <>
            <div className="section-header">
              <h2>Manage Faculties</h2>
              <button className="btn-primary" onClick={handleAddFaculty}>
                <FaPlus /> Add Faculty
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((faculty) => (
                    <tr key={faculty.id}>
                      <td>{faculty.name}</td>
                      <td>{faculty.description}</td>
                      <td>{new Date(faculty.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-icon" onClick={() => handleEditFaculty(faculty)}>
                          <FaEdit />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteFaculty(faculty.id)}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==================== COURSES TAB ==================== */}
        {activeTab === 'courses' && (
          <>
            <div className="section-header">
              <h2>Manage Courses</h2>
              <button className="btn-primary" onClick={handleAddCourse}>
                <FaPlus /> Add Course
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Faculty</th>
                    <th>Duration</th>
                    <th>Level</th>
                    <th>Enrollment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.name}</td>
                      <td>{course.faculty?.name || 'N/A'}</td>
                      <td>{course.duration}</td>
                      <td>{course.level}</td>
                      <td>{course.enrolledCount || 0} / {course.capacity || 50}</td>
                      <td>
                        <button className="btn-icon" onClick={() => handleEditCourse(course)}>
                          <FaEdit />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteCourse(course.id)}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==================== APPLICATIONS TAB ==================== */}
        {activeTab === 'applications' && (
          <>
            <h2>Student Applications</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Course</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td>{app.student?.name}</td>
                      <td>{app.student?.email}</td>
                      <td>{app.course?.name}</td>
                      <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-info btn-sm"
                          onClick={() => handleViewApplicationDetails(app)}
                          title="View full application details"
                        >
                          <FaEye /> View Details
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button
                              className="btn-success btn-sm"
                              onClick={() => handleUpdateApplicationStatus(app.id, 'admitted')}
                            >
                              <FaCheck /> Admit
                            </button>
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => handleUpdateApplicationStatus(app.id, 'rejected')}
                            >
                              <FaTimes /> Reject
                            </button>
                          </>
                        )}
                        {app.status === 'admitted' && (
                          <span style={{ color: '#28a745' }}>Admitted</span>
                        )}
                        {app.status === 'rejected' && (
                          <span style={{ color: '#dc3545' }}>Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==================== PUBLISH ADMISSIONS TAB ==================== */}
        {activeTab === 'admissions' && (
          <>
            <div className="section-header">
              <h2>Publish Admission Announcement</h2>
              <button className="btn-primary" onClick={handlePublishAdmissions}>
                <FaBullhorn /> New Announcement
              </button>
            </div>
            <div className="info-card">
              <p>Use this feature to publish admission announcements to notify prospective students about new intake periods, requirements, and deadlines.</p>
            </div>
          </>
        )}

        {/* ==================== PROFILE TAB ==================== */}
        {activeTab === 'profile' && (
          <>
            <div className="section-header">
              <h2>Update Institution Profile</h2>
              <button className="btn-primary" onClick={handleEditProfile}>
                <FaEdit /> Edit Profile
              </button>
            </div>
            
            {profile ? (
              <div className="profile-card">
                <div className="profile-section">
                  <div className="info-row">
                    <label>Institution Name:</label>
                    <span>{profile.name}</span>
                  </div>
                  <div className="info-row">
                    <label>Email:</label>
                    <span>{profile.email}</span>
                  </div>
                  <div className="info-row">
                    <label>Location:</label>
                    <span>{profile.location || 'Not provided'}</span>
                  </div>
                  <div className="info-row">
                    <label>Phone:</label>
                    <span>{profile.phone || 'Not provided'}</span>
                  </div>
                  <div className="info-row">
                    <label>Website:</label>
                    <span>{profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer">{profile.website}</a> : 'Not provided'}</span>
                  </div>
                  <div className="info-row">
                    <label>Description:</label>
                    <span>{profile.description || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FaUser size={48} />
                <h3>No Profile Found</h3>
                <p>Could not load your institution profile</p>
              </div>
            )}
          </>
        )}

        {/* ==================== NOTIFICATIONS TAB ==================== */}
        {activeTab === 'notifications' && (
          <>
            <div className="section-header">
              <h2>Notifications</h2>
              <p className="subtitle">Stay updated with applications and system alerts</p>
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
                      {notif.type === 'application' && <FaUsers />}
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

        {/* ==================== MODALS ==================== */}
        
        {/* Application Details Modal */}
        {showModal && modalType === 'view-application-details' && selectedApplication && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Application Details</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>X</button>
              </div>
              
              <div className="modal-body details-section">
                {error && <div className="error-message">{error}</div>}
                
                {/* Student Information Section */}
                <div className="details-panel">
                  <h3><FaUser /> Student Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Full Name:</label>
                      <span>{selectedApplication.student?.name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label><FaEnvelope /> Email:</label>
                      <span>{selectedApplication.student?.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label><FaPhone /> Phone:</label>
                      <span>{selectedApplication.student?.phone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label><FaMapMarkerAlt /> Address:</label>
                      <span>{selectedApplication.student?.address || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Date of Birth:</label>
                      <span>{selectedApplication.student?.dateOfBirth ? new Date(selectedApplication.student.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Gender:</label>
                      <span>{selectedApplication.student?.gender || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Application Information Section */}
                <div className="details-panel">
                  <h3><FaFileAlt /> Application Details</h3>
                  <div className="details-grid">
                    <div className="detail-item full-width">
                      <label>Applied Course:</label>
                      <span><strong>{selectedApplication.course?.name || 'N/A'}</strong></span>
                    </div>
                    <div className="detail-item">
                      <label>Application Date:</label>
                      <span>{new Date(selectedApplication.appliedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span>
                        <span className={`status-badge status-${selectedApplication.status}`}>
                          {selectedApplication.status.toUpperCase()}
                        </span>
                      </span>
                    </div>
                    {selectedApplication.reason && (
                      <div className="detail-item full-width">
                        <label>Decision Reason:</label>
                        <span>{selectedApplication.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Background Section */}
                <div className="details-panel">
                  <h3><FaGraduationCap /> Academic Background</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Field of Study:</label>
                      <span>{selectedApplication.student?.field || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Previous Institution:</label>
                      <span>{selectedApplication.student?.previousInstitution || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>GPA/Grade:</label>
                      <span>{selectedApplication.student?.gpa || 'N/A'}</span>
                    </div>
                    {selectedApplication.student?.qualifications && (
                      <div className="detail-item full-width">
                        <label>Qualifications:</label>
                        <span>{selectedApplication.student.qualifications}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Uploaded Documents Section */}
                <div className="details-panel">
                  <h3><FaFileAlt /> Academic Documents & Certificates</h3>
                  {studentTranscripts && studentTranscripts.length > 0 ? (
                    <div className="documents-list">
                      {studentTranscripts.map((transcript, idx) => (
                        <div key={idx}>
                          {/* Main Transcript */}
                          <div className="document-item">
                            <div className="document-info">
                              <span className="document-name">📄 Main Transcript</span>
                              <span className="document-date">
                                Uploaded: {new Date(transcript.uploadedAt).toLocaleDateString()}
                              </span>
                              <span className="document-meta">
                                Qualification: {transcript.qualificationLevel || 'N/A'} | GPA: {transcript.gpa || 'N/A'}
                              </span>
                            </div>
                            {transcript.transcriptUrl && (
                              <a 
                                href={transcript.transcriptUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn-small"
                              >
                                <FaDownload /> Download
                              </a>
                            )}
                          </div>

                          {/* Certificates */}
                          {transcript.certificates && transcript.certificates.length > 0 && (
                            <div className="certificates-section">
                              <h4>📋 Certificates ({transcript.certificates.length})</h4>
                              <div className="certificates-list">
                                {transcript.certificates.map((certUrl, certIdx) => (
                                  <div key={certIdx} className="document-item">
                                    <div className="document-info">
                                      <span className="document-name">Certificate {certIdx + 1}</span>
                                    </div>
                                    <a 
                                      href={certUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="btn-small"
                                    >
                                      <FaDownload /> Download
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Subject Details */}
                          {transcript.subjects && transcript.subjects.length > 0 && (
                            <div className="subjects-section">
                              <h4>📚 Subjects ({transcript.subjects.length})</h4>
                              <div className="subjects-table">
                                <div className="subjects-header">
                                  <div>Subject</div>
                                  <div>Grade</div>
                                </div>
                                {transcript.subjects.map((subject, subjIdx) => (
                                  <div key={subjIdx} className="subjects-row">
                                    <div>{subject.subject || 'N/A'}</div>
                                    <div>{subject.grade || 'N/A'}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="overall-grade">
                                Overall: <strong>{transcript.overallPercentage || 'N/A'}%</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No documents uploaded</p>
                  )}
                </div>

                {/* Application Notes Section */}
                {selectedApplication.notes && (
                  <div className="details-panel">
                    <h3>Additional Notes</h3>
                    <div className="notes-box">
                      {selectedApplication.notes}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedApplication.status === 'pending' && (
                  <div className="modal-actions">
                    <button 
                      className="btn-success" 
                      onClick={() => {
                        handleUpdateApplicationStatus(selectedApplication.id, 'admitted');
                        setShowModal(false);
                      }}
                    >
                      <FaCheck /> Admit This Student
                    </button>
                    <button 
                      className="btn-danger" 
                      onClick={() => {
                        handleUpdateApplicationStatus(selectedApplication.id, 'rejected');
                        setShowModal(false);
                      }}
                    >
                      <FaTimes /> Reject Application
                    </button>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
                
                {selectedApplication.status !== 'pending' && (
                  <div className="modal-actions">
                    <button 
                      className="btn-secondary" 
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Faculty Modal */}
        {showModal && (modalType === 'add-faculty' || modalType === 'edit-faculty') && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingItem ? 'Edit' : 'Add'} Faculty</h2>
              <form onSubmit={handleSubmitFaculty}>
                <div className="form-group">
                  <label>Faculty Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Faculty of Engineering"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    placeholder="Brief description of the faculty..."
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add')} Faculty
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Course Modal */}
        {showModal && (modalType === 'add-course' || modalType === 'edit-course') && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <h2>{editingItem ? 'Edit' : 'Add'} Course</h2>
              <form onSubmit={handleSubmitCourse}>
                {/* Basic Course Information */}
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginTop: 0 }}>Basic Information</h3>
                  
                  <div className="form-group">
                    <label>Faculty *</label>
                    <select
                      value={formData.facultyId}
                      onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                      required
                    >
                      <option value="">Select Faculty</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Course Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      placeholder="Course description..."
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Duration *</label>
                      <input
                        type="text"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        placeholder="e.g., 3 years"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Level *</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        required
                      >
                        <option value="Certificate">Certificate</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Degree">Degree</option>
                        <option value="Masters">Masters</option>
                        <option value="PhD">PhD</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Requirements *</label>
                      <textarea
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                        placeholder="e.g., LGCSE with 5 credits"
                        rows="2"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Student Capacity *</label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Admission Requirements - Subject-Based Matching */}
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginTop: 0 }}>Admission Requirements (Subject Matching)</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1rem' }}>
                    Set specific subject requirements that students must have to be eligible for this course.
                    Students will only see this course if they meet these requirements.
                  </p>

                  {/* Minimum Overall Percentage */}
                  <div className="form-group">
                    <label>Minimum Overall Percentage (0-100)</label>
                    <input
                      type="number"
                      value={formData.minimumOverallPercentage}
                      onChange={(e) => setFormData({ ...formData, minimumOverallPercentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                      min="0"
                      max="100"
                      placeholder="e.g., 70"
                    />
                    <small style={{ color: '#9ca3af', display: 'block', marginTop: '0.25rem' }}>
                      Student's overall average must be at least this percentage
                    </small>
                  </div>

                  {/* Required Subjects */}
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Required Subjects (Students MUST have all of these)
                    </label>
                    <div style={{ 
                      background: '#f9fafb', 
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      {(formData.requiredSubjects || []).map((subject, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr auto',
                          gap: '0.75rem',
                          marginBottom: idx < (formData.requiredSubjects || []).length - 1 ? '0.75rem' : 0,
                          alignItems: 'end',
                          paddingBottom: idx < (formData.requiredSubjects || []).length - 1 ? '0.75rem' : 0,
                          borderBottom: idx < (formData.requiredSubjects || []).length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}>
                          <input
                            type="text"
                            value={subject.subjectName}
                            onChange={(e) => {
                              const updated = [...(formData.requiredSubjects || [])];
                              updated[idx].subjectName = e.target.value;
                              setFormData({ ...formData, requiredSubjects: updated });
                            }}
                            placeholder="e.g., Mathematics"
                          />
                          <input
                            type="number"
                            value={subject.minimumMark}
                            onChange={(e) => {
                              const updated = [...(formData.requiredSubjects || [])];
                              updated[idx].minimumMark = parseInt(e.target.value) || 0;
                              setFormData({ ...formData, requiredSubjects: updated });
                            }}
                            min="0"
                            max="100"
                            placeholder="Min %"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.requiredSubjects || []).filter((_, i) => i !== idx);
                              setFormData({ ...formData, requiredSubjects: updated });
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.requiredSubjects || []), { subjectName: '', minimumMark: 0 }];
                          setFormData({ ...formData, requiredSubjects: updated });
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          marginTop: (formData.requiredSubjects || []).length > 0 ? '0.75rem' : 0
                        }}
                      >
                        + Add Required Subject
                      </button>
                    </div>
                  </div>

                  {/* Optional Additional Subjects */}
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Optional Additional Subjects (Nice to have - increases match score)
                    </label>
                    <div style={{ 
                      background: '#f9fafb', 
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      {(formData.additionalSubjects || []).map((subject, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr auto',
                          gap: '0.75rem',
                          marginBottom: idx < (formData.additionalSubjects || []).length - 1 ? '0.75rem' : 0,
                          alignItems: 'end',
                          paddingBottom: idx < (formData.additionalSubjects || []).length - 1 ? '0.75rem' : 0,
                          borderBottom: idx < (formData.additionalSubjects || []).length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}>
                          <input
                            type="text"
                            value={subject.subjectName}
                            onChange={(e) => {
                              const updated = [...(formData.additionalSubjects || [])];
                              updated[idx].subjectName = e.target.value;
                              setFormData({ ...formData, additionalSubjects: updated });
                            }}
                            placeholder="e.g., Physics"
                          />
                          <input
                            type="number"
                            value={subject.preferredMinimumMark}
                            onChange={(e) => {
                              const updated = [...(formData.additionalSubjects || [])];
                              updated[idx].preferredMinimumMark = parseInt(e.target.value) || 0;
                              setFormData({ ...formData, additionalSubjects: updated });
                            }}
                            min="0"
                            max="100"
                            placeholder="Preferred %"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.additionalSubjects || []).filter((_, i) => i !== idx);
                              setFormData({ ...formData, additionalSubjects: updated });
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.additionalSubjects || []), { subjectName: '', preferredMinimumMark: 0 }];
                          setFormData({ ...formData, additionalSubjects: updated });
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          marginTop: (formData.additionalSubjects || []).length > 0 ? '0.75rem' : 0
                        }}
                      >
                        + Add Optional Subject
                      </button>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingItem ? 'Update' : 'Add'} Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {showModal && modalType === 'edit-profile' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Institution Profile</h2>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label>Institution Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Institution name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@institution.edu"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.institution.edu"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    placeholder="Brief description about your institution..."
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Publish Admissions Modal */}
        {showModal && modalType === 'publish-admissions' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <h2>Publish Admission Announcement</h2>
              <form onSubmit={handleSubmitAdmissions}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 2025 Academic Year Admissions Now Open"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows="6"
                    placeholder="Detailed admission announcement message..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Application Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <FaBullhorn /> Publish Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}