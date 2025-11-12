// client/src/pages/CompanyDashboard.jsx - COMPLETE WITH AUTO-CLEAR NOTIFICATIONS
import React, { useState, useEffect } from 'react';
import { companyAPI } from '../utils/api';
import { FaPlus, FaTrash, FaBriefcase, FaEye, FaGraduationCap, FaCertificate, FaBriefcase as FaWork, FaCheckCircle, FaBell } from 'react-icons/fa';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { useTabNotifications } from '../hooks/useTabNotifications';
import NotificationBadge from '../components/NotificationBadge';
import axios from 'axios';
import '../styles/global.css';

export default function CompanyDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ NOTIFICATION INTEGRATION
  const { counts, refreshCounts } = useNotificationCounts(user?.role || 'company', user?.uid);
  const { tabNotifications, clearTabNotification } = useTabNotifications(user?.role || 'company', user?.uid);

  // Clear tab notifications when tab is opened
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      clearTabNotification(activeTab);
    }
  }, [activeTab, clearTabNotification]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await companyAPI.getJobs();
      setJobs(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setNotifications(response.data);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setNotifications([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab]);

  const handleAddJob = () => {
    setModalType('add-job');
    setFormData({
      title: '',
      description: '',
      requirements: '',
      qualifications: '',
      experience: '',
      location: '',
      salary: '',
      deadline: ''
    });
    setShowModal(true);
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    try {
      await companyAPI.postJob(formData);
      setSuccess('Job posted successfully!');
      setShowModal(false);
      loadJobs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteJob = async (id) => {
    if (window.confirm('Delete this job posting?')) {
      try {
        await companyAPI.deleteJob(id);
        loadJobs();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleViewApplicants = async (job) => {
    setSelectedJob(job);
    try {
      const data = await companyAPI.getJobApplicants(job.id);
      setApplicants(data);
      setModalType('view-applicants');
      setShowModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (appId, status) => {
    try {
      await companyAPI.updateApplicationStatus(appId, status);
      setSuccess(`Application updated to ${status}!`);
      handleViewApplicants(selectedJob);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent Match';
    if (score >= 80) return 'Very Good Match';
    if (score >= 70) return 'Good Match';
    return 'Below Threshold';
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <button
          className={activeTab === 'jobs' ? 'active' : ''}
          onClick={() => setActiveTab('jobs')}
        >
          <FaBriefcase /> My Jobs
          {tabNotifications?.jobs > 0 && (
            <NotificationBadge count={tabNotifications.jobs} variant="success" />
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
          <h1>Company Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {user.status === 'pending' && (
          <div className="warning-message">
            Your account is pending admin approval. You can post jobs once approved.
          </div>
        )}

        {/* ==================== JOBS TAB ==================== */}
        {activeTab === 'jobs' && user.status === 'active' && (
          <>
            <div className="section-header">
              <h2>Manage Job Postings</h2>
              <button className="btn-primary" onClick={handleAddJob}>
                <FaPlus /> Post New Job
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Location</th>
                    <th>Salary</th>
                    <th>Deadline</th>
                    <th>Qualified Applicants</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.title}</td>
                      <td>{job.location}</td>
                      <td>{job.salary}</td>
                      <td>{new Date(job.deadline).toLocaleDateString()}</td>
                      <td>
                        <span className="badge" style={{ background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>
                          {job.qualifiedApplicants || 0} qualified
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${job.status}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-info btn-sm"
                          onClick={() => handleViewApplicants(job)}
                        >
                          <FaEye /> View Qualified
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteJob(job.id)}
                        >
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

        {/* ==================== NOTIFICATIONS TAB ==================== */}
        {activeTab === 'notifications' && (
          <>
            <div className="section-header">
              <h2>Notifications</h2>
              <p className="subtitle">Stay updated with job applications and system alerts</p>
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
                      {notif.type === 'job' && <FaBriefcase />}
                      {notif.type === 'application' && <FaGraduationCap />}
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

        {/* ==================== ADD JOB MODAL ==================== */}
        {showModal && modalType === 'add-job' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <h2>Post New Job</h2>
              <form onSubmit={handleSubmitJob}>
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Requirements</label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    rows="3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Qualifications</label>
                  <input
                    type="text"
                    placeholder="e.g., Bachelor's Degree"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Experience Required</label>
                  <input
                    type="text"
                    placeholder="e.g., 2-3 years"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Salary Range</label>
                  <input
                    type="text"
                    placeholder="e.g., M5,000 - M8,000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Application Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Post Job
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== VIEW APPLICANTS MODAL ==================== */}
        {showModal && modalType === 'view-applicants' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
              <h2>Interview-Ready Applicants: {selectedJob?.title}</h2>
              <p style={{ color: '#10b981', fontSize: '14px', marginBottom: '20px' }}>
                <FaCheckCircle style={{ marginRight: '5px' }} />
                Showing only applicants with ≥70% qualification match
              </p>
              
              <div className="applicants-list">
                {applicants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No interview-ready applicants yet.</p>
                    <p style={{ fontSize: '14px', marginTop: '10px' }}>
                      Applicants must score at least 70% to appear here.
                    </p>
                  </div>
                ) : (
                  applicants.map((app) => (
                    <div key={app.id} className="applicant-card-enhanced">
                      {/* Header Section */}
                      <div className="applicant-header">
                        <div>
                          <h3>{app.student?.name}</h3>
                          <p style={{ color: '#6b7280', fontSize: '14px' }}>{app.student?.email}</p>
                        </div>
                        <div className="qualification-badge" style={{ 
                          backgroundColor: getScoreColor(app.qualificationScore),
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                            {app.qualificationScore}%
                          </div>
                          <div style={{ fontSize: '12px' }}>
                            {getScoreLabel(app.qualificationScore)}
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="score-breakdown">
                        <h4>Qualification Breakdown</h4>
                        <div className="score-bars">
                          <div className="score-item">
                            <div className="score-label">
                              <FaGraduationCap style={{ color: '#3b82f6' }} />
                              <span>Academic Performance</span>
                            </div>
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ 
                                  width: `${(app.scoreBreakdown.academic / 30) * 100}%`,
                                  backgroundColor: '#3b82f6'
                                }}
                              />
                            </div>
                            <span className="score-value">{app.scoreBreakdown.academic}/30</span>
                          </div>

                          <div className="score-item">
                            <div className="score-label">
                              <FaCertificate style={{ color: '#10b981' }} />
                              <span>Extra Certificates</span>
                            </div>
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ 
                                  width: `${(app.scoreBreakdown.certificates / 20) * 100}%`,
                                  backgroundColor: '#10b981'
                                }}
                              />
                            </div>
                            <span className="score-value">{app.scoreBreakdown.certificates}/20</span>
                          </div>

                          <div className="score-item">
                            <div className="score-label">
                              <FaWork style={{ color: '#f59e0b' }} />
                              <span>Work Experience</span>
                            </div>
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ 
                                  width: `${(app.scoreBreakdown.experience / 25) * 100}%`,
                                  backgroundColor: '#f59e0b'
                                }}
                              />
                            </div>
                            <span className="score-value">{app.scoreBreakdown.experience}/25</span>
                          </div>

                          <div className="score-item">
                            <div className="score-label">
                              <FaCheckCircle style={{ color: '#8b5cf6' }} />
                              <span>Job Relevance</span>
                            </div>
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ 
                                  width: `${(app.scoreBreakdown.relevance / 25) * 100}%`,
                                  backgroundColor: '#8b5cf6'
                                }}
                              />
                            </div>
                            <span className="score-value">{app.scoreBreakdown.relevance}/25</span>
                          </div>
                        </div>
                      </div>

                      {/* Cover Letter */}
                      <div className="cover-letter-section">
                        <h4>Cover Letter</h4>
                        <p>{app.coverLetter}</p>
                      </div>

                      {/* Actions */}
                      <div className="applicant-actions">
                        <button
                          className="btn-success btn-sm"
                          onClick={() => handleUpdateStatus(app.id, 'interview')}
                        >
                          Schedule Interview
                        </button>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleUpdateStatus(app.id, 'hired')}
                        >
                          Hire
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleUpdateStatus(app.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .applicant-card-enhanced {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .applicant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f3f4f6;
        }

        .score-breakdown {
          margin-bottom: 20px;
        }

        .score-breakdown h4 {
          margin-bottom: 16px;
          color: #1f2937;
          font-size: 16px;
        }

        .score-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .score-item {
          display: grid;
          grid-template-columns: 200px 1fr 60px;
          align-items: center;
          gap: 12px;
        }

        .score-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #4b5563;
        }

        .score-bar {
          height: 24px;
          background: #f3f4f6;
          border-radius: 12px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .score-value {
          font-weight: 600;
          font-size: 14px;
          text-align: right;
        }

        .cover-letter-section {
          margin-bottom: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .cover-letter-section h4 {
          margin-bottom: 8px;
          color: #1f2937;
          font-size: 14px;
        }

        .cover-letter-section p {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
        }

        .modal-content.extra-large {
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}