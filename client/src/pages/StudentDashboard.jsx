// client/src/pages/StudentDashboard.jsx - ENHANCED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { studentAPI } from '../utils/api';
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
  //FaFilter,
  //FaDownload,
  FaTrophy
} from 'react-icons/fa';
import '../styles/global.css';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('institutions');
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
 // const [selectedCourse, setSelectedCourse] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);

  // Load data based on active tab
  const loadData = useCallback(async () => {
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
      } else if (activeTab === 'profile') {
        const data = await studentAPI.getProfile();
        setProfile(data);
      } else if (activeTab === 'notifications') {
        const data = await studentAPI.getNotifications();
        setNotifications(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load notifications count on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await studentAPI.getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    loadNotifications();
  }, []);

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
      loadData();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
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
    setModalType('apply-job');
    setShowModal(true);
  };

  const handleSubmitJobApplication = async (e) => {
    e.preventDefault();
    const coverLetter = e.target.coverLetter.value;
    try {
      await studentAPI.applyForJob(selectedJob.id, { coverLetter });
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

  const handleUploadTranscript = async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData();

  try {
    setError('');

    // Validate transcript file
    if (!form.transcript.files[0]) {
      setError('Please select a transcript file');
      return;
    }

    // Add transcript file
    formData.append('transcript', form.transcript.files[0]);

    // Add certificate files (optional)
    if (form.certificates.files.length > 0) {
      for (let i = 0; i < form.certificates.files.length; i++) {
        formData.append('certificates', form.certificates.files[i]);
      }
    }

    // Add other fields
    formData.append('graduationYear', form.graduationYear.value);
    if (form.gpa.value) formData.append('gpa', form.gpa.value);
    if (form.activities.value) {
      formData.append('extraCurricularActivities',
        JSON.stringify(form.activities.value.split(',').map(a => a.trim()))
      );
    }

    // Upload
    const result = await studentAPI.uploadTranscript(formData);
    setSuccess(result.message);
    setShowModal(false);
    form.reset();

    // Reload data after 2 seconds
    setTimeout(() => {
      loadData();
    }, 2000);
  } catch (err) {
    setError(err.response?.data?.error || err.message);
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

  // Filter institutions
  const filteredInstitutions = institutions.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter courses
  const filteredCourses = courses.filter(course => 
    (filterLevel === 'all' || course.level === filterLevel) &&
    (searchTerm === '' || course.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter jobs
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count applications per institution
  const getApplicationCount = (institutionId) => {
    return applications.filter(app => app.institutionId === institutionId).length;
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

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
          {applications.filter(app => app.status === 'admitted').length > 0 && (
            <span className="badge">{applications.filter(app => app.status === 'admitted').length}</span>
          )}
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
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser /> My Profile
        </button>
        <button
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          <FaBell /> Notifications
          {unreadNotifications > 0 && (
            <span className="badge">{unreadNotifications}</span>
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

        {/* BROWSE INSTITUTIONS TAB */}
        {activeTab === 'institutions' && (
          <>
            <div className="section-header">
              <h2>Higher Learning Institutions in Lesotho</h2>
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
            <div className="cards-grid">
              {filteredInstitutions.map((inst) => {
                const appCount = getApplicationCount(inst.id);
                return (
                  <div key={inst.id} className="institution-card">
                    <h3>{inst.name}</h3>
                    <p><strong>Location:</strong> {inst.location}</p>
                    <p>{inst.description}</p>
                    <div className="card-footer">
                      <span className="app-count">
                        {appCount}/2 applications used
                      </span>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleViewCourses(inst)}
                        disabled={appCount >= 2}
                      >
                        {appCount >= 2 ? 'Max Applications Reached' : 'View Courses'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                            <span className="text-success">✓ Enrolled</span>
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
              <div className="search-bar">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search jobs by title, company, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {!profile?.isGraduate && (
              <div className="info-banner">
                <FaFile />
                <div>
                  <strong>Upload Your Transcript to Apply for Jobs</strong>
                  <p>You must be a graduate and upload your academic transcript before applying for job positions.</p>
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setModalType('upload-transcript');
                      setShowModal(true);
                    }}
                  >
                    Upload Transcript
                  </button>
                </div>
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

        {/* VIEW COURSES MODAL */}
{showModal && modalType === 'view-courses' && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
      <h2>Courses at {selectedInstitution?.name}</h2>
      
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
  {filteredCourses.map((course) => (
    <div key={course.id} className={`course-item ${!course.eligible ? 'not-eligible' : ''}`}>
      <h3>{course.name}</h3>
      <p><strong>Faculty:</strong> {course.faculty?.name}</p>
      <p><strong>Duration:</strong> {course.duration}</p>
      <p><strong>Level:</strong> {course.level}</p>
      <p>{course.description}</p>
      
      {/* REQUIREMENT #2: Show eligibility status */}
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
  ))}
</div>
      <button className="btn-secondary" onClick={() => {
        setShowModal(false);
        setSearchTerm('');
        setFilterLevel('all');
      }}>
        Close
      </button>
    </div>
  </div>
)}

{/* APPLY FOR JOB MODAL */}
{showModal && modalType === 'apply-job' && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h2>Apply for {selectedJob?.title}</h2>
      <div className="job-details">
        <p><strong>Company:</strong> {selectedJob?.company}</p>
        <p><strong>Location:</strong> {selectedJob?.location}</p>
        <p><strong>Salary:</strong> {selectedJob?.salary}</p>
      </div>
      <form onSubmit={handleSubmitJobApplication}>
        <div className="form-group">
          <label>Cover Letter *</label>
          <textarea
            name="coverLetter"
            rows="8"
            placeholder="Explain why you're a great fit for this position..."
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

{/* UPLOAD TRANSCRIPT MODAL - ONLY ONE VERSION WITH FILE UPLOAD */}
{showModal && modalType === 'upload-transcript' && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
      <h2>Upload Academic Transcript</h2>
      <p className="subtitle">Complete your graduation profile to apply for jobs</p>
      <form onSubmit={handleUploadTranscript}>
        <div className="form-group">
          <label>Transcript File (PDF) *</label>
          <input 
            type="file" 
            name="transcript" 
            accept=".pdf"
            required
          />
          <small>Upload your official academic transcript (PDF only, max 10MB)</small>
        </div>

        <div className="form-group">
          <label>Graduation Year *</label>
          <input 
            type="number" 
            name="graduationYear" 
            min="2000" 
            max={new Date().getFullYear()}
            required 
          />
        </div>

        <div className="form-group">
          <label>GPA (Optional)</label>
          <input 
            type="number" 
            name="gpa" 
            step="0.01" 
            min="0" 
            max="4"
            placeholder="e.g., 3.5"
          />
        </div>

        <div className="form-group">
          <label>Additional Certificates (PDF, optional)</label>
          <input 
            type="file" 
            name="certificates" 
            accept=".pdf"
            multiple
          />
          <small>You can select multiple certificate files (max 5)</small>
        </div>

        <div className="form-group">
          <label>Extra-Curricular Activities (comma-separated)</label>
          <textarea
            name="activities"
            rows="3"
            placeholder="e.g., Student Council President, Debate Team, Volunteer Work"
          />
        </div>

        <div className="modal-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Upload Transcript
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