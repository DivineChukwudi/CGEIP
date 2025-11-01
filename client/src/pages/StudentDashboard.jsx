// client/src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { studentAPI } from '../utils/api';
import { FaGraduationCap, FaBriefcase, FaFileUpload, FaEye, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import '../styles/global.css';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('institutions');
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'institutions') {
        const data = await studentAPI.getInstitutions();
        setInstitutions(data);
      } else if (activeTab === 'my-applications') {
        const data = await studentAPI.getApplications();
        setApplications(data);
      } else if (activeTab === 'jobs') {
        const data = await studentAPI.getJobs();
        setJobs(data);
      } else if (activeTab === 'my-jobs') {
        const data = await studentAPI.getJobApplications();
        setJobApplications(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourses = async (institution) => {
    setSelectedInstitution(institution);
    try {
      const data = await studentAPI.getInstitutionCourses(institution.id);
      setCourses(data);
      setModalType('view-courses');
      setShowModal(true);
    } catch (err) {
      setError(err.message);
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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApplyJob = async (job) => {
    setModalType('apply-job');
    setSelectedCourse(job);
    setShowModal(true);
  };

  const handleSubmitJobApplication = async (e) => {
    e.preventDefault();
    const coverLetter = e.target.coverLetter.value;
    try {
      await studentAPI.applyForJob(selectedCourse.id, { coverLetter });
      setSuccess('Job application submitted successfully!');
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'admitted':
      case 'hired':
        return <FaCheckCircle className="status-icon success" />;
      case 'rejected':
        return <FaTimesCircle className="status-icon danger" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <button
          className={activeTab === 'institutions' ? 'active' : ''}
          onClick={() => setActiveTab('institutions')}
        >
          <FaGraduationCap /> Browse Institutions
        </button>
        <button
          className={activeTab === 'my-applications' ? 'active' : ''}
          onClick={() => setActiveTab('my-applications')}
        >
          <FaEye /> My Applications
        </button>
        <button
          className={activeTab === 'jobs' ? 'active' : ''}
          onClick={() => setActiveTab('jobs')}
        >
          <FaBriefcase /> Browse Jobs
        </button>
        <button
          className={activeTab === 'my-jobs' ? 'active' : ''}
          onClick={() => setActiveTab('my-jobs')}
        >
          <FaFileUpload /> My Job Applications
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Student Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'institutions' && (
          <>
            <h2>Higher Learning Institutions in Lesotho</h2>
            <div className="cards-grid">
              {institutions.map((inst) => (
                <div key={inst.id} className="institution-card">
                  <h3>{inst.name}</h3>
                  <p><strong>Location:</strong> {inst.location}</p>
                  <p>{inst.description}</p>
                  <button className="btn-primary" onClick={() => handleViewCourses(inst)}>
                    View Courses
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'my-applications' && (
          <>
            <h2>My Course Applications</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td>{app.institution?.name}</td>
                      <td>{app.course?.name}</td>
                      <td>
                        {getStatusIcon(app.status)}
                        <span className={`status-badge status-${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'jobs' && (
          <>
            <h2>Available Job Opportunities</h2>
            <div className="cards-grid">
              {jobs.map((job) => (
                <div key={job.id} className="job-card">
                  <h3>{job.title}</h3>
                  <p><strong>Company:</strong> {job.company}</p>
                  <p><strong>Location:</strong> {job.location}</p>
                  <p><strong>Salary:</strong> {job.salary}</p>
                  <p>{job.description}</p>
                  <button className="btn-primary" onClick={() => handleApplyJob(job)}>
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'my-jobs' && (
          <>
            <h2>My Job Applications</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Applied Date</th>
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
                          {app.status}
                        </span>
                      </td>
                      <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showModal && modalType === 'view-courses' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Courses at {selectedInstitution?.name}</h2>
              <div className="courses-list">
                {courses.map((course) => (
                  <div key={course.id} className="course-item">
                    <h3>{course.name}</h3>
                    <p><strong>Faculty:</strong> {course.faculty?.name}</p>
                    <p><strong>Duration:</strong> {course.duration}</p>
                    <p><strong>Level:</strong> {course.level}</p>
                    <p>{course.description}</p>
                    <button className="btn-primary" onClick={() => handleApplyCourse(course)}>
                      Apply for this Course
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {showModal && modalType === 'apply-job' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Apply for {selectedCourse?.title}</h2>
              <form onSubmit={handleSubmitJobApplication}>
                <div className="form-group">
                  <label>Cover Letter</label>
                  <textarea
                    name="coverLetter"
                    rows="6"
                    placeholder="Write your cover letter..."
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Submit Application
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