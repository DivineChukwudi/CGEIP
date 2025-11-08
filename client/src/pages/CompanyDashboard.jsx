// client/src/pages/CompanyDashboard.jsx
import React, { useState, useEffect } from 'react';
import { companyAPI } from '../utils/api';
import { FaPlus, FaTrash, FaBriefcase, FaEye } from 'react-icons/fa';
import '../styles/global.css';

export default function CompanyDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <button
          className={activeTab === 'jobs' ? 'active' : ''}
          onClick={() => setActiveTab('jobs')}
        >
          <FaBriefcase /> My Jobs
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

        {user.status === 'active' && (
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
                        <span className={`status-badge status-${job.status}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-info btn-sm"
                          onClick={() => handleViewApplicants(job)}
                        >
                          <FaEye /> View Applicants
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

        {showModal && modalType === 'view-applicants' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <h2>Qualified Applicants for: {selectedJob?.title}</h2>
              <div className="applicants-list">
                {applicants.length === 0 ? (
                  <p>No qualified applicants yet.</p>
                ) : (
                  applicants.map((app) => (
                    <div key={app.id} className="applicant-card">
                      <h3>{app.student?.name}</h3>
                      <p><strong>Email:</strong> {app.student?.email}</p>
                      <p><strong>Qualification Score:</strong> {app.qualificationScore}%</p>
                      <p><strong>Cover Letter:</strong> {app.coverLetter}</p>
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
    </div>
  );
}