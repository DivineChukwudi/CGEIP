// client/src/pages/InstitutionDashboard.jsx - COMPLETE WITH AUTO-CLEAR NOTIFICATIONS
import React, { useState, useEffect, useCallback } from 'react';
import { institutionAPI } from '../utils/api';
import { FaGraduationCap, FaUsers, FaCheck, FaTimes, FaPlus, FaEdit, FaTrash, FaBook, FaChartBar, FaBullhorn, FaBell } from 'react-icons/fa';
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
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ NOTIFICATION INTEGRATION
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
      capacity: 50
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
      capacity: course.capacity
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
        await institutionAPI.addCourse(formData);
        showSuccess('Course added successfully!');
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

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === 'dashboard' && statistics && (
          <>
            <h2>Overview Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Faculties</h3>
                <p className="stat-number">{statistics.totalFaculties}</p>
              </div>
              <div className="stat-card">
                <h3>Total Courses</h3>
                <p className="stat-number">{statistics.totalCourses}</p>
              </div>
              <div className="stat-card">
                <h3>Total Applications</h3>
                <p className="stat-number">{statistics.totalApplications}</p>
              </div>
              <div className="stat-card">
                <h3>Pending Applications</h3>
                <p className="stat-number">{statistics.pendingApplications}</p>
              </div>
              <div className="stat-card">
                <h3>Admitted Students</h3>
                <p className="stat-number">{statistics.admittedStudents}</p>
              </div>
              <div className="stat-card">
                <h3>Enrollment</h3>
                <p className="stat-number">{statistics.totalEnrolled} / {statistics.totalCapacity}</p>
              </div>
            </div>
          </>
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
                          <span style={{ color: '#28a745' }}>✓ Admitted</span>
                        )}
                        {app.status === 'rejected' && (
                          <span style={{ color: '#dc3545' }}>✗ Rejected</span>
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
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingItem ? 'Update' : 'Add'} Faculty
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