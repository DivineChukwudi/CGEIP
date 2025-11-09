// client/src/pages/AdminDashboard.jsx - FIXED WITH SEARCH & SORT
import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/api';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaBriefcase, FaChartBar, FaCheck, FaTimes, FaUsers, FaGraduationCap, FaBook, FaUserGraduate, FaSearch, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import NotificationBadge from '../components/NotificationBadge';
import axios from 'axios';
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

  // ==================== SEARCH & SORT STATE ====================
  const [searchTerms, setSearchTerms] = useState({
    institutions: '',
    faculties: '',
    courses: '',
    companies: '',
    users: ''
  });

  const [sortConfig, setSortConfig] = useState({
    institutions: { key: 'name', order: 'asc' },
    faculties: { key: 'name', order: 'asc' },
    courses: { key: 'name', order: 'asc' },
    companies: { key: 'name', order: 'asc' },
    users: { key: 'createdAt', order: 'desc' }
  });

  // Notifications - FIXED: Only trigger on tab change to users
  const { counts, refreshCounts } = useNotificationCounts(user?.role || 'admin', user?.uid);
  const [lastNotificationCount, setLastNotificationCount] = useState(counts.totalUsers);

  // Mark notifications as read ONLY when users tab is clicked
  useEffect(() => {
    const markNotificationsRead = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (activeTab === 'users') {
        try {
          await axios.put(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/read-by-category`,
            { category: 'users' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setLastNotificationCount(counts.totalUsers);
          refreshCounts();
        } catch (error) {
          console.error('Error marking notifications as read:', error);
        }
      }
    };

    markNotificationsRead();
  }, [activeTab, counts.totalUsers, refreshCounts]);

  // ==================== SEARCH HELPER ====================
  const searchFilter = (items, searchTerm) => {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      // Search across common fields
      const searchFields = [
        item.name,
        item.email,
        item.location,
        item.contact,
        item.website,
        item.description,
        item.title,
        item.company,
        item.role
      ].filter(Boolean);

      return searchFields.some(field => 
        String(field).toLowerCase().includes(term)
      );
    });
  };

  // ==================== SORT HELPER ====================
  const sortItems = (items, sortKey) => {
    const { key, order } = sortConfig[sortKey];
    
    const sorted = [...items].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      // Handle nested fields and dates
      if (key === 'createdAt' || key === 'updatedAt') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // ==================== TOGGLE SORT ====================
  const toggleSort = (tabName, sortKey) => {
    setSortConfig(prev => ({
      ...prev,
      [tabName]: {
        key: sortKey,
        order: prev[tabName].key === sortKey && prev[tabName].order === 'asc' ? 'desc' : 'asc'
      }
    }));
  };

  // ==================== LOAD DATA ====================
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

  // ==================== HELPER FUNCTIONS ====================
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getInstitutionName = (instId) => {
    const inst = institutions.find(i => i.id === instId);
    return inst ? inst.name : 'Unknown';
  };

  const getFacultyName = (facId) => {
    const fac = faculties.find(f => f.id === facId);
    return fac ? fac.name : 'Unknown';
  };

  const filteredFaculties = formData.institutionId 
    ? faculties.filter(f => f.institutionId === formData.institutionId)
    : [];

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

  // ==================== USER MANAGEMENT ====================
  const handleDeleteUser = async (userId, userName) => {
    try {
      const summary = await adminAPI.deleteUser(userId, false);
      
      let confirmMsg = `Delete "${userName}"?\n\nThis will permanently delete:\n- User account\n`;
      
      if (summary.relatedData.applications > 0) {
        confirmMsg += `- ${summary.relatedData.applications} course applications\n`;
      }
      if (summary.relatedData.jobApplications > 0) {
        confirmMsg += `- ${summary.relatedData.jobApplications} job applications\n`;
      }
      if (summary.relatedData.jobs > 0) {
        confirmMsg += `- ${summary.relatedData.jobs} job postings\n`;
      }
      if (summary.relatedData.faculties > 0) {
        confirmMsg += `- ${summary.relatedData.faculties} faculties\n`;
      }
      if (summary.relatedData.courses > 0) {
        confirmMsg += `- ${summary.relatedData.courses} courses\n`;
      }
      if (summary.relatedData.notifications > 0) {
        confirmMsg += `- ${summary.relatedData.notifications} notifications\n`;
      }
      if (summary.relatedData.transcripts > 0) {
        confirmMsg += `- ${summary.relatedData.transcripts} transcripts\n`;
      }
      
      confirmMsg += `\nTotal items to delete: ${summary.totalRelatedItems + 1}\n\nThis action CANNOT be undone!`;
      
      if (window.confirm(confirmMsg)) {
        await adminAPI.deleteUser(userId, true);
        showSuccess(`User "${userName}" and all related data deleted successfully!`);
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // ==================== RENDER FILTERED & SORTED DATA ====================
  const getDisplayedItems = (tabName) => {
    let items = [];
    let searchKey = tabName;

    if (tabName === 'institutions') {
      items = institutions;
    } else if (tabName === 'faculties') {
      items = faculties;
    } else if (tabName === 'courses') {
      items = courses;
    } else if (tabName === 'companies') {
      items = companies;
    } else if (tabName === 'users') {
      items = allUsers;
      searchKey = 'users';
    }

    const searched = searchFilter(items, searchTerms[searchKey]);
    return sortItems(searched, tabName);
  };

  // ==================== SORT BUTTON COMPONENT ====================
  const SortButton = ({ tabName, sortKey, label }) => {
    const config = sortConfig[tabName];
    const isActive = config.key === sortKey;
    const isAsc = config.order === 'asc';

    return (
      <button
        onClick={() => toggleSort(tabName, sortKey)}
        style={{
          background: isActive ? '#f3f4f6' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: isActive ? '#1f2937' : '#9ca3af',
          fontSize: '12px',
          fontWeight: isActive ? '600' : '400',
          transition: 'all 0.2s'
        }}
        title={`Sort by ${label}`}
      >
        {label}
        {isActive && (
          isAsc ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />
        )}
      </button>
    );
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
          {counts?.pendingCompanies > 0 && (
            <NotificationBadge count={counts.pendingCompanies} variant="warning" />
          )}
        </button>
        
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          <FaUserGraduate /> All Users
          {counts?.totalUsers > 0 && (
            <NotificationBadge 
              count={counts.totalUsers} 
              variant="info"
            />
          )}
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
            
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search institutions..."
                value={searchTerms.institutions}
                onChange={(e) => setSearchTerms({ ...searchTerms, institutions: e.target.value })}
              />
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th><SortButton tabName="institutions" sortKey="name" label="Name" /></th>
                    <th><SortButton tabName="institutions" sortKey="location" label="Location" /></th>
                    <th>Contact</th>
                    <th>Website</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayedItems('institutions').map((inst) => (
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
            
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search faculties..."
                value={searchTerms.faculties}
                onChange={(e) => setSearchTerms({ ...searchTerms, faculties: e.target.value })}
              />
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th><SortButton tabName="faculties" sortKey="name" label="Faculty Name" /></th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayedItems('faculties').map((faculty) => (
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
            
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerms.courses}
                onChange={(e) => setSearchTerms({ ...searchTerms, courses: e.target.value })}
              />
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Faculty</th>
                    <th><SortButton tabName="courses" sortKey="name" label="Course Name" /></th>
                    <th><SortButton tabName="courses" sortKey="level" label="Level" /></th>
                    <th>Duration</th>
                    <th>Capacity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayedItems('courses').map((course) => (
                    <tr key={course.id}>
                      <td>{getInstitutionName(course.institutionId)}</td>
                      <td>{getFacultyName(course.facultyId)}</td>
                      <td>{course.name}</td>
                      <td>{course.level}</td>
                      <td>{course.duration}</td>
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
            
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerms.companies}
                onChange={(e) => setSearchTerms({ ...searchTerms, companies: e.target.value })}
              />
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th><SortButton tabName="companies" sortKey="name" label="Company Name" /></th>
                    <th>Email</th>
                    <th><SortButton tabName="companies" sortKey="status" label="Status" /></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayedItems('companies').map((company) => (
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
            
            <div className="search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerms.users}
                onChange={(e) => setSearchTerms({ ...searchTerms, users: e.target.value })}
              />
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th><SortButton tabName="users" sortKey="name" label="Name" /></th>
                    <th><SortButton tabName="users" sortKey="email" label="Email" /></th>
                    <th><SortButton tabName="users" sortKey="role" label="Role" /></th>
                    <th><SortButton tabName="users" sortKey="status" label="Status" /></th>
                    <th>Email Verified</th>
                    <th><SortButton tabName="users" sortKey="createdAt" label="Registered" /></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayedItems('users').map((u) => (
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
                      <td>
                        {u.id !== user.uid && (
                          <button
                            className="btn-icon danger"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete user and all related data"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </td>
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