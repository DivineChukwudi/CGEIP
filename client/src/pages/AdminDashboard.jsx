// client/src/pages/AdminDashboard.jsx - FIXED ALL ESLINT ISSUES
import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/api';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaBriefcase, FaChartBar, FaCheck, FaTimes, FaUsers, FaGraduationCap, FaBook, FaUserGraduate } from 'react-icons/fa';
import '../styles/global.css';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [institutions, setInstitutions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      if (activeTab === 'dashboard') {
        const data = await adminAPI.getReports();
        setStats(data);
      } else if (activeTab === 'institutions') {
        const data = await adminAPI.getInstitutions();
        setInstitutions(data);
      } else if (activeTab === 'faculties') {
        const [instData, facData] = await Promise.all([
          adminAPI.getInstitutions(),
          adminAPI.getAllFaculties()
        ]);
        setInstitutions(instData);
        setFaculties(facData);
      } else if (activeTab === 'courses') {
        const [instData, facData, courseData] = await Promise.all([
          adminAPI.getInstitutions(),
          adminAPI.getAllFaculties(),
          adminAPI.getAllCourses()
        ]);
        setInstitutions(instData);
        setFaculties(facData);
        setCourses(courseData);
      } else if (activeTab === 'companies') {
        const data = await adminAPI.getCompanies();
        setCompanies(data);
      } else if (activeTab === 'users') {
        const data = await adminAPI.getUsers();
        setAllUsers(data);
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

  // ==================== INSTITUTION MANAGEMENT ====================
  const handleAddInstitution = () => {
    setModalType('add-institution');
    setEditingItem(null);
    setFormData({ name: '', description: '', location: '', contact: '', website: '' });
    setShowModal(true);
  };

  const handleEditInstitution = (inst) => {
    setModalType('edit-institution');
    setEditingItem(inst);
    setFormData({ 
      name: inst.name,
      description: inst.description,
      location: inst.location,
      contact: inst.contact,
      website: inst.website
    });
    setShowModal(true);
  };

  const handleSubmitInstitution = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await adminAPI.updateInstitution(editingItem.id, formData);
        showSuccess('Institution updated successfully!');
      } else {
        await adminAPI.addInstitution(formData);
        showSuccess('Institution added successfully!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteInstitution = async (id) => {
    if (window.confirm('Are you sure? This will delete all related faculties, courses, and applications.')) {
      try {
        await adminAPI.deleteInstitution(id);
        showSuccess('Institution deleted successfully!');
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // ==================== FACULTY MANAGEMENT ====================
  const handleAddFaculty = () => {
    setModalType('add-faculty');
    setEditingItem(null);
    setFormData({ institutionId: '', name: '', description: '' });
    setShowModal(true);
  };

  const handleEditFaculty = (faculty) => {
    setModalType('edit-faculty');
    setEditingItem(faculty);
    setFormData({
      institutionId: faculty.institutionId,
      name: faculty.name,
      description: faculty.description
    });
    setShowModal(true);
  };

  const handleSubmitFaculty = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await adminAPI.updateFaculty(editingItem.id, formData);
        showSuccess('Faculty updated successfully!');
      } else {
        await adminAPI.addFaculty(formData);
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
        await adminAPI.deleteFaculty(id);
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
      institutionId: '',
      facultyId: '',
      name: '',
      description: '',
      duration: '',
      level: '',
      requirements: '',
      capacity: 50
    });
    setShowModal(true);
  };

  const handleEditCourse = (course) => {
    setModalType('edit-course');
    setEditingItem(course);
    setFormData({
      institutionId: course.institutionId,
      facultyId: course.facultyId,
      name: course.name,
      description: course.description,
      duration: course.duration,
      level: course.level,
      requirements: course.requirements,
      capacity: course.capacity || 50
    });
    setShowModal(true);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await adminAPI.updateCourse(editingItem.id, formData);
        showSuccess('Course updated successfully!');
      } else {
        await adminAPI.addCourse(formData);
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
        await adminAPI.deleteCourse(id);
        showSuccess('Course deleted successfully!');
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // ==================== COMPANY MANAGEMENT ====================
  const handleUpdateCompanyStatus = async (id, status) => {
    try {
      await adminAPI.updateCompanyStatus(id, status);
      showSuccess(`Company ${status} successfully!`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (window.confirm('Delete this company?')) {
      try {
        await adminAPI.deleteCompany(id);
        showSuccess('Company deleted successfully!');
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Get institution name helper
  const getInstitutionName = (instId) => {
    const inst = institutions.find(i => i.id === instId);
    return inst ? inst.name : 'Unknown';
  };

  // Get faculty name helper
  const getFacultyName = (facId) => {
    const fac = faculties.find(f => f.id === facId);
    return fac ? fac.name : 'Unknown';
  };

  // Filter faculties by selected institution
  const filteredFaculties = formData.institutionId 
    ? faculties.filter(f => f.institutionId === formData.institutionId)
    : [];

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
          className={activeTab === 'institutions' ? 'active' : ''}
          onClick={() => setActiveTab('institutions')}
        >
          <FaBuilding /> Institutions
        </button>
        <button
          className={activeTab === 'faculties' ? 'active' : ''}
          onClick={() => setActiveTab('faculties')}
        >
          <FaGraduationCap /> Faculties
        </button>
        <button
          className={activeTab === 'courses' ? 'active' : ''}
          onClick={() => setActiveTab('courses')}
        >
          <FaBook /> Courses
        </button>
        <button
          className={activeTab === 'companies' ? 'active' : ''}
          onClick={() => setActiveTab('companies')}
        >
          <FaBriefcase /> Companies
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          <FaUserGraduate /> All Users
        </button>
        <button
          className={activeTab === 'team' ? 'active' : ''}
          onClick={() => window.location.href = '/admin/team'}
        >
          <FaUsers /> Manage Team
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === 'dashboard' && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Institutions</h3>
              <p className="stat-number">{stats.totalInstitutions}</p>
            </div>
            <div className="stat-card">
              <h3>Total Students</h3>
              <p className="stat-number">{stats.totalStudents}</p>
            </div>
            <div className="stat-card">
              <h3>Total Companies</h3>
              <p className="stat-number">{stats.totalCompanies}</p>
            </div>
            <div className="stat-card">
              <h3>Total Applications</h3>
              <p className="stat-number">{stats.totalApplications}</p>
            </div>
            <div className="stat-card">
              <h3>Total Jobs</h3>
              <p className="stat-number">{stats.totalJobs}</p>
            </div>
            <div className="stat-card">
              <h3>Job Applications</h3>
              <p className="stat-number">{stats.totalJobApplications}</p>
            </div>
          </div>
        )}

        {/* ==================== INSTITUTIONS TAB ==================== */}
        {activeTab === 'institutions' && (
          <>
            <div className="section-header">
              <h2>Manage Institutions</h2>
              <button className="btn-primary" onClick={handleAddInstitution}>
                <FaPlus /> Add Institution
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Website</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.id}>
                      <td>{inst.name}</td>
                      <td>{inst.location}</td>
                      <td>{inst.contact}</td>
                      <td>{inst.website}</td>
                      <td>
                        <button className="btn-icon" onClick={() => handleEditInstitution(inst)}>
                          <FaEdit />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteInstitution(inst.id)}>
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
                    <th>Institution</th>
                    <th>Faculty Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((faculty) => (
                    <tr key={faculty.id}>
                      <td>{getInstitutionName(faculty.institutionId)}</td>
                      <td>{faculty.name}</td>
                      <td>{faculty.description}</td>
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
                    <th>Institution</th>
                    <th>Faculty</th>
                    <th>Course Name</th>
                    <th>Duration</th>
                    <th>Level</th>
                    <th>Capacity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>{getInstitutionName(course.institutionId)}</td>
                      <td>{getFacultyName(course.facultyId)}</td>
                      <td>{course.name}</td>
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

        {/* ==================== COMPANIES TAB ==================== */}
        {activeTab === 'companies' && (
          <>
            <div className="section-header">
              <h2>Manage Companies</h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.email}</td>
                      <td>
                        <span className={`status-badge status-${company.status}`}>
                          {company.status}
                        </span>
                      </td>
                      <td>
                        {company.status === 'pending' && (
                          <button
                            className="btn-success btn-sm"
                            onClick={() => handleUpdateCompanyStatus(company.id, 'active')}
                          >
                            <FaCheck /> Approve
                          </button>
                        )}
                        {company.status === 'active' && (
                          <button
                            className="btn-warning btn-sm"
                            onClick={() => handleUpdateCompanyStatus(company.id, 'suspended')}
                          >
                            <FaTimes /> Suspend
                          </button>
                        )}
                        {company.status === 'suspended' && (
                          <button
                            className="btn-success btn-sm"
                            onClick={() => handleUpdateCompanyStatus(company.id, 'active')}
                          >
                            <FaCheck /> Activate
                          </button>
                        )}
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteCompany(company.id)}
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

        {/* ==================== USERS TAB ==================== */}
        {activeTab === 'users' && (
          <>
            <div className="section-header">
              <h2>All Registered Users</h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Email Verified</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className="status-badge" style={{ textTransform: 'capitalize' }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${u.status || 'active'}`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td>{u.emailVerified ? '✓ Yes' : '✗ No'}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==================== MODALS ==================== */}
        
        {/* Institution Modal */}
        {showModal && (modalType === 'add-institution' || modalType === 'edit-institution') && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingItem ? 'Edit' : 'Add'} Institution</h2>
              <form onSubmit={handleSubmitInstitution}>
                <div className="form-group">
                  <label>Institution Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact *</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Website *</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingItem ? 'Update' : 'Add'} Institution
                  </button>
                </div>
              </form>
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
                  <label>Institution *</label>
                  <select
                    value={formData.institutionId}
                    onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                    required
                    disabled={!!editingItem}
                  >
                    <option value="">Select Institution</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Faculty Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  <label>Institution *</label>
                  <select
                    value={formData.institutionId}
                    onChange={(e) => setFormData({ ...formData, institutionId: e.target.value, facultyId: '' })}
                    required
                    disabled={!!editingItem}
                  >
                    <option value="">Select Institution</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Faculty *</label>
                  <select
                    value={formData.facultyId}
                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                    required
                    disabled={!formData.institutionId || !!editingItem}
                  >
                    <option value="">Select Faculty</option>
                    {filteredFaculties.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name}
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
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Duration *</label>
                  <input
                    type="text"
                    placeholder="e.g., 3 years"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
                    <option value="">Select Level</option>
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
      </div>
    </div>
  );
}