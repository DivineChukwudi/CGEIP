import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/api';
import { FaCertificate } from 'react-icons/fa';
import { FaPlus, FaClock, FaEye, FaEdit, FaTrash, FaBuilding, FaBriefcase, FaChartBar, FaCheck, FaTimes, FaUsers, FaGraduationCap, FaBook, FaUserGraduate, FaSearch, FaArrowUp, FaArrowDown, FaFileAlt, FaChartLine } from 'react-icons/fa';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { useTabNotifications } from '../hooks/useTabNotifications';
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
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportMetrics, setReportMetrics] = useState(null);

  // ==================== SEARCH & SORT STATE ====================
  const [searchTerms, setSearchTerms] = useState({
    institutions: '',
    faculties: '',
    courses: '',
    companies: '',
    users: '',
    transcripts: '',
    admissions: '',
    reports: ''
  });

  const [sortConfig, setSortConfig] = useState({
    institutions: { key: 'name', order: 'asc' },
    faculties: { key: 'name', order: 'asc' },
    courses: { key: 'name', order: 'asc' },
    companies: { key: 'name', order: 'asc' },
    users: { key: 'createdAt', order: 'desc' },
    admissions: { key: 'startDate', order: 'desc' },
    reports: { key: 'generatedAt', order: 'desc' }
  });

  // Notifications - FIXED: Only trigger on tab change to users
  const { counts, refreshCounts } = useNotificationCounts(user?.role || 'admin', user?.uid);
  const { tabNotifications, clearTabNotification } = useTabNotifications(user?.role || 'admin', user?.uid);

  // Clear tab notifications when tab is opened
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      clearTabNotification(activeTab);
    }
  }, [activeTab, clearTabNotification]);

  // Auto-refresh tab notification counts every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshCounts]);

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
      } else if (activeTab === 'transcripts') {
        const data = await adminAPI.getTranscripts();
        setTranscripts(data);
      } else if (activeTab === 'admissions') {
        const data = await adminAPI.getAdmissions();
        setAdmissions(data);
      } else if (activeTab === 'reports') {
        const [reportData, metricsData] = await Promise.all([
          adminAPI.getSystemReports(),
          adminAPI.getReportMetrics()
        ]);
        setReports(reportData);
        setReportMetrics(metricsData);
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

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      // Handle ISO strings
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString();
      }
      // Handle Firestore Timestamp objects
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString();
      }
      // Handle regular Date objects
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (err) {
      return 'Invalid Date';
    }
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
    // Prevent double submission on React StrictMode double-render
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Validate institutionId
      if (!formData.institutionId) {
        setError('Please select an institution');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.name || !formData.name.trim()) {
        setError('Please enter a faculty name');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.description || !formData.description.trim()) {
        setError('Please enter a description');
        setIsSubmitting(false);
        return;
      }
      
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
      console.error('Faculty submission error:', err);
      setError(err.message || 'Failed to save faculty');
    } finally {
      setIsSubmitting(false);
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

// ==================== TRANSCRIPT MANAGEMENT ====================
const handleViewTranscript = (transcript) => {
  setSelectedTranscript(transcript);
  setModalType('view-transcript');
  setShowModal(true);
}; 

const handleVerifyTranscript = async (transcriptId, studentId) => {
  try {
    await adminAPI.verifyTranscript(transcriptId);
    
    // Send notification to student
    await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/notify-student`,
      {
        studentId,
        title: 'Transcript Verified',
        message: 'Your academic transcript has been verified by the admin. You can now apply for jobs!',
        type: 'general'
      },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }
    );

    showSuccess('Transcript verified successfully! Student has been notified.');
    loadData();
  } catch (err) {
    setError(err.message);
  }
};

const handleDeclineTranscript = async (transcriptId, studentId) => {
  const reason = prompt('Please provide a reason for declining this transcript (minimum 10 characters):');
  
  if (!reason) {
    return; // User cancelled
  }
  
  if (reason.trim().length < 10) {
    setError('Decline reason must be at least 10 characters long');
    return;
  }
  
  try {
    await adminAPI.declineTranscript(transcriptId, reason);
    
    // Send notification to student
    await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/notify-student`,
      {
        studentId,
        title: 'Transcript Declined',
        message: `Your transcript has been declined. Reason: ${reason}. Please upload a new transcript that meets our requirements.`,
        type: 'general'
      },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }
    );

    showSuccess('Transcript declined. Student has been notified.');
    loadData();
  } catch (err) {
    setError(err.message);
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

  // ==================== ADMISSIONS MANAGEMENT ====================
  const handleDeleteAdmission = async (admissionId) => {
    if (window.confirm('Are you sure you want to delete this admission period?')) {
      try {
        await adminAPI.deleteAdmission(admissionId);
        showSuccess('Admission period deleted successfully!');
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSaveAdmission = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await adminAPI.updateAdmission(editingItem.id, formData);
        showSuccess('Admission period updated successfully!');
      } else {
        await adminAPI.createAdmission(formData);
        showSuccess('Admission period created successfully!');
      }
      setShowModal(false);
      setFormData({ title: '', description: '', startDate: '', endDate: '', status: 'open' });
      setEditingItem(null);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== REPORTS MANAGEMENT ====================
  const handleGenerateReport = async () => {
    try {
      setIsSubmitting(true);
      await adminAPI.generateSystemReport();
      showSuccess('Report generation started! Please refresh to see the new report.');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const report = await adminAPI.viewReport(reportId);
      setFormData(report);
      setModalType('view-report');
      setShowModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const report = await adminAPI.viewReport(reportId);
      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess('Report downloaded successfully!');
    } catch (err) {
      setError(err.message);
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
    } else if (tabName === 'transcripts') {
    items = transcripts;
    searchKey = 'transcripts';
  } else if (tabName === 'admissions') {
    items = admissions;
    searchKey = 'admissions';
  } else if (tabName === 'reports') {
    items = reports;
    searchKey = 'reports';
  }

    const searched = searchFilter(items, searchTerms[searchKey]);
    return sortItems(searched, tabName);
  };

  // Alias for consistency
  const getFilteredAndSortedData = (items, tabName) => {
    const searched = searchFilter(items, searchTerms[tabName] || '');
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
          className={activeTab === 'companies' ? 'active' : ''}
          onClick={() => setActiveTab('companies')}
        >
          <FaBriefcase /> Companies
          {tabNotifications?.companies > 0 && (
            <NotificationBadge count={tabNotifications.companies} variant="warning" />
          )}
        </button>
        
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          <FaUserGraduate /> All Users
          {tabNotifications?.users > 0 && (
            <NotificationBadge count={tabNotifications.users} variant="info" />
          )}
        </button>
        
        <button
          className={activeTab === 'team' ? 'active' : ''}
          onClick={() => window.location.href = '/admin/team'}
        >
          <FaUsers /> Manage Team
        </button>

        <button
          className={activeTab === 'transcripts' ? 'active' : ''}
          onClick={() => setActiveTab('transcripts')}
        >
          <FaCertificate /> Verify Transcripts
          {tabNotifications?.transcripts > 0 && (
            <NotificationBadge count={tabNotifications.transcripts} variant="warning" />
          )}
        </button>

        <button
          className={activeTab === 'admissions' ? 'active' : ''}
          onClick={() => setActiveTab('admissions')}
        >
          <FaFileAlt /> Publish Admissions
        </button>

        <button
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          <FaChartLine /> System Reports
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
                      <td>{u.emailVerified ? 'Yes' : 'No'}</td>
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


{/* ==================== TRANSCRIPT VERIFICATION TAB ==================== */}
{activeTab === 'transcripts' && (
  <>
    <div className="section-header">
      <h2>Student Transcript Verification</h2>
      <p className="subtitle">Review and verify student transcripts</p>
    </div>
    
    <div className="search-bar">
      <FaSearch />
      <input
        type="text"
        placeholder="Search by student name or email..."
        value={searchTerms.transcripts || ''}
        onChange={(e) => setSearchTerms({ ...searchTerms, transcripts: e.target.value })}
      />
    </div>

    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Email</th>
            <th>Graduation Year</th>
            <th>Overall %</th>
            <th>Subjects</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transcripts.map((transcript) => (
            <tr key={transcript.id}>
              <td>{transcript.studentInfo?.name || 'Unknown'}</td>
              <td>{transcript.studentInfo?.email || 'N/A'}</td>
              <td>{transcript.graduationYear}</td>
              <td>{transcript.overallPercentage || 'N/A'}%</td>
              <td>{transcript.subjects?.length || 0} subjects</td>
                <td>
                <span className={`status-badge ${
                  transcript.verified ? 'status-active' : 
                  transcript.declined ? 'status-rejected' : 
                  'status-pending'
                }`}>
                  {transcript.verified ? 'Verified' : 
                   transcript.declined ? 'Declined' : 
                   '⏳ Pending'}
                </span>
              </td>
              <td>{new Date(transcript.uploadedAt).toLocaleDateString()}</td>
             <td>
                <button
                  className="btn-info btn-sm"
                  onClick={() => handleViewTranscript(transcript)}
                >
                  <FaEye /> View
                </button>
                {!transcript.verified && !transcript.declined && (
                  <>
                    <button
                      className="btn-success btn-sm"
                      onClick={() => handleVerifyTranscript(transcript.id, transcript.studentId)}
                    >
                      <FaCheck /> Verify
                    </button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleDeclineTranscript(transcript.id, transcript.studentId)}
                    >
                      <FaTimes /> Decline
                    </button>
                  </>
                )}
                {transcript.declined && (
                  <span className="text-danger">Declined</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
)}

{/* ==================== ADMISSIONS TAB ==================== */}
{activeTab === 'admissions' && (
  <>
    <div className="section-header">
      <h2>Publish Admissions</h2>
      <button className="btn-primary" onClick={() => {
        setModalType('add-admission');
        setEditingItem(null);
        setFormData({ title: '', description: '', startDate: '', endDate: '', status: 'open' });
        setShowModal(true);
      }}>
        <FaPlus /> Create Admission Period
      </button>
    </div>

    <div className="search-bar">
      <FaSearch />
      <input
        type="text"
        placeholder="Search admissions..."
        value={searchTerms.admissions || ''}
        onChange={(e) => setSearchTerms({ ...searchTerms, admissions: e.target.value })}
      />
    </div>

    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th><SortButton tabName="admissions" sortKey="title" label="Title" /></th>
            <th><SortButton tabName="admissions" sortKey="startDate" label="Start Date" /></th>
            <th><SortButton tabName="admissions" sortKey="endDate" label="End Date" /></th>
            <th>Status</th>
            <th>Applications</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {getFilteredAndSortedData(admissions, 'admissions').map((admission) => (
            <tr key={admission.id}>
              <td><strong>{admission.title}</strong></td>
              <td>{formatDate(admission.startDate)}</td>
              <td>{formatDate(admission.endDate)}</td>
              <td>
                <span className={`status-badge status-${admission.status || 'unknown'}`}>
                  {(admission.status || 'unknown').toUpperCase()}
                </span>
              </td>
              <td>{admission.applicationCount || 0}</td>
              <td>
                <button
                  className="btn-info btn-sm"
                  onClick={() => {
                    setEditingItem(admission);
                    setFormData(admission);
                    setModalType('edit-admission');
                    setShowModal(true);
                  }}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  className="btn-danger btn-sm"
                  onClick={() => handleDeleteAdmission(admission.id)}
                >
                  <FaTrash /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
)}

{/* ==================== SYSTEM REPORTS TAB ==================== */}
{activeTab === 'reports' && (
  <>
    <div className="section-header">
      <h2>System Reports & Analytics</h2>
      <button className="btn-primary" onClick={() => handleGenerateReport()}>
        <FaPlus /> Generate New Report
      </button>
    </div>

    {reportMetrics && (
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Admissions</h3>
          <p className="stat-number">{reportMetrics.activeAdmissions}</p>
        </div>
        <div className="stat-card">
          <h3>Total Applications</h3>
          <p className="stat-number">{reportMetrics.totalApplications}</p>
        </div>
        <div className="stat-card">
          <h3>Admitted Students</h3>
          <p className="stat-number">{reportMetrics.admittedStudents}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Reviews</h3>
          <p className="stat-number">{reportMetrics.pendingReviews}</p>
        </div>
      </div>
    )}

    <div className="search-bar">
      <FaSearch />
      <input
        type="text"
        placeholder="Search reports..."
        value={searchTerms.reports || ''}
        onChange={(e) => setSearchTerms({ ...searchTerms, reports: e.target.value })}
      />
    </div>

    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th><SortButton tabName="reports" sortKey="name" label="Report Name" /></th>
            <th><SortButton tabName="reports" sortKey="type" label="Type" /></th>
            <th><SortButton tabName="reports" sortKey="generatedAt" label="Generated" /></th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {getFilteredAndSortedData(reports, 'reports').map((report) => (
            <tr key={report.id}>
              <td><strong>{report.name}</strong></td>
              <td>{report.type}</td>
              <td>{formatDate(report.generatedAt)}</td>
              <td>
                <span className={`status-badge status-${report.status || 'unknown'}`}>
                  {(report.status || 'unknown').toUpperCase()}
                </span>
              </td>
              <td>
                <button
                  className="btn-info btn-sm"
                  onClick={() => handleViewReport(report.id)}
                >
                  <FaEye /> View
                </button>
                <button
                  className="btn-warning btn-sm"
                  onClick={() => handleDownloadReport(report.id)}
                >
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
)}

{/* ==================== TRANSCRIPT DETAIL MODAL ==================== */}
{showModal && modalType === 'view-transcript' && selectedTranscript && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Transcript Details</h2>
        <button className="close-modal-btn" onClick={() => setShowModal(false)}>
          <FaTimes />
        </button>
      </div>

      <div className="transcript-details">
        {/* Student Info */}
        <div className="info-section">
          <h3>Student Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Name:</strong>
              <span>{selectedTranscript.studentInfo?.name}</span>
            </div>
            <div className="info-item">
              <strong>Email:</strong>
              <span>{selectedTranscript.studentInfo?.email}</span>
            </div>
            <div className="info-item">
              <strong>Graduation Year:</strong>
              <span>{selectedTranscript.graduationYear}</span>
            </div>
            <div className="info-item">
              <strong>Overall Percentage:</strong>
              <span>{selectedTranscript.overallPercentage || 'N/A'}%</span>
            </div>
          </div>
        </div>

        {/* Transcript Document */}
        <div className="info-section">
          <h3>Transcript Document</h3>
          <div className="document-preview">
            <a 
              href={selectedTranscript.transcriptUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <FaEye /> View Transcript PDF
            </a>
          </div>
        </div>

        {/* Subjects and Grades */}
        {selectedTranscript.subjects && selectedTranscript.subjects.length > 0 && (
          <div className="info-section">
            <h3>Subjects and Grades</h3>
            <div className="subjects-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTranscript.subjects.map((subject, index) => (
                    <tr key={index}>
                      <td>{subject.subject}</td>
                      <td><span className="grade-badge">{subject.grade}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Certificates */}
        {selectedTranscript.certificates && selectedTranscript.certificates.length > 0 && (
          <div className="info-section">
            <h3>Additional Certificates</h3>
            <div className="certificates-list">
              {selectedTranscript.certificates.map((cert, index) => (
                <a 
                  key={index}
                  href={cert} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="certificate-link"
                >
                  Certificate {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Extra-Curricular Activities */}
        {selectedTranscript.extraCurricularActivities && selectedTranscript.extraCurricularActivities.length > 0 && (
          <div className="info-section">
            <h3>Extra-Curricular Activities</h3>
            <ul className="activities-list">
              {selectedTranscript.extraCurricularActivities.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </div>
        )}

{/* Verification Status */}
        <div className="info-section">
          <h3>Verification Status</h3>
          <div className="verification-status">
            {selectedTranscript.verified ? (
              <div className="verified-badge">
                <FaCheckCircle style={{ color: '#10b981' }} />
                <span>Verified on {new Date(selectedTranscript.verifiedAt).toLocaleDateString()}</span>
              </div>
            ) : selectedTranscript.declined ? (
              <div className="declined-badge">
                <FaTimesCircle style={{ color: '#ef4444' }} />
                <div>
                  <span>Declined on {new Date(selectedTranscript.declinedAt).toLocaleDateString()}</span>
                  <p className="decline-reason"><strong>Reason:</strong> {selectedTranscript.declineReason}</p>
                </div>
              </div>
            ) : (
              <div className="pending-badge">
                <FaClock style={{ color: '#f59e0b' }} />
                <span>Pending Verification</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button 
          className="btn-secondary" 
          onClick={() => setShowModal(false)}
        >
          Close
        </button>
        {!selectedTranscript.verified && !selectedTranscript.declined && (
          <>
            <button
              className="btn-danger"
              onClick={() => {
                handleDeclineTranscript(selectedTranscript.id, selectedTranscript.studentId);
                setShowModal(false);
              }}
            >
              <FaTimes /> Decline Transcript
            </button>
            <button
              className="btn-success"
              onClick={() => {
                handleVerifyTranscript(selectedTranscript.id, selectedTranscript.studentId);
                setShowModal(false);
              }}
            >
              <FaCheck /> Verify Transcript
            </button>
          </>
        )}
      </div>
    </div>
  </div>
)}

<style jsx>{`
  .transcript-details {
    max-height: 70vh;
    overflow-y: auto;
  }

  .info-section {
    background: #f9fafb;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .info-section h3 {
    margin: 0 0 15px 0;
    color: #1f2937;
    font-size: 16px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 10px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .info-item strong {
    color: #6b7280;
    font-size: 13px;
  }

  .info-item span {
    color: #1f2937;
    font-size: 15px;
    font-weight: 600;
  }

  .document-preview {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .subjects-table {
    overflow-x: auto;
  }

  .subjects-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .subjects-table th,
  .subjects-table td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  .subjects-table th {
    background: #f3f4f6;
    font-weight: 600;
    color: #374151;
  }

  .grade-badge {
    background: #667eea;
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
  }

  .certificates-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .certificate-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 15px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
  }

  .certificate-link:hover {
    background: #f3f4f6;
    border-color: #667eea;
  }

  .activities-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .activities-list li {
    padding: 10px;
    background: white;
    border-left: 3px solid #f59e0b;
    margin-bottom: 8px;
    border-radius: 4px;
  }

  .verification-status {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .verified-badge,
  .pending-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 25px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
  }

  .verified-badge {
    background: #d1fae5;
    color: #065f46;
  }

  .pending-badge {
    background: #fef3c7;
    color: #92400e;
  }

  .modal-content.extra-large {
    max-width: 900px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
  }

  .modal-header h2 {
    margin: 0;
    color: #1f2937;
  }

  .close-modal-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #6b7280;
    cursor: pointer;
    padding: 5px;
    transition: color 0.2s;
  }

  .close-modal-btn:hover {
    color: #1f2937;
  }

  @media (max-width: 768px) {
    .info-grid {
      grid-template-columns: 1fr;
    }
  }
    .verified-badge,
  .pending-badge,
  .declined-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 25px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
  }

  .verified-badge {
    background: #d1fae5;
    color: #065f46;
  }

  .pending-badge {
    background: #fef3c7;
    color: #92400e;
  }

  .declined-badge {
    background: #fee2e2;
    color: #991b1b;
    flex-direction: column;
    align-items: flex-start;
  }

  .declined-badge > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .decline-reason {
    margin-top: 10px;
    padding: 10px;
    background: white;
    border-left: 3px solid #ef4444;
    border-radius: 4px;
    font-size: 14px;
    font-weight: normal;
    color: #374151;
  }

  .text-danger {
    color: #ef4444 !important;
    font-weight: 600;
  }
`}</style>
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
                  <label>Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="e.g., https://www.institution.edu"
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

        {/* Admission Modal */}
        {showModal && (modalType === 'add-admission' || modalType === 'edit-admission') && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingItem ? 'Edit' : 'Create'} Admission Period</h2>
              <form onSubmit={handleSaveAdmission}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 2024/2025 Academic Year"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this admission period"
                    rows="3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={formData.status || 'open'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Create')} Admission
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report View Modal */}
        {showModal && modalType === 'view-report' && formData && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>System Report - {formData.name}</h2>
                <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                  <FaTimes />
                </button>
              </div>

              <div className="report-details">
                {/* Report Info */}
                <div className="info-section">
                  <h3>Report Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Report Name:</strong>
                      <span>{formData.name}</span>
                    </div>
                    <div className="info-item">
                      <strong>Type:</strong>
                      <span>{formData.type || 'System Summary'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Status:</strong>
                      <span className={`status-badge status-${formData.status || 'unknown'}`}>
                        {(formData.status || 'unknown').toUpperCase()}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Generated:</strong>
                      <span>{formatDate(formData.generatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                {formData.metrics && (
                  <div className="info-section">
                    <h3>System Metrics</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Total Admissions:</strong>
                        <span>{formData.metrics.totalAdmissions}</span>
                      </div>
                      <div className="info-item">
                        <strong>Active Admissions:</strong>
                        <span>{formData.metrics.activeAdmissions}</span>
                      </div>
                      <div className="info-item">
                        <strong>Total Applications:</strong>
                        <span>{formData.metrics.totalApplications}</span>
                      </div>
                      <div className="info-item">
                        <strong>Admitted Students:</strong>
                        <span>{formData.metrics.admittedStudents}</span>
                      </div>
                      <div className="info-item">
                        <strong>Pending Reviews:</strong>
                        <span>{formData.metrics.pendingReviews}</span>
                      </div>
                      <div className="info-item">
                        <strong>Total Students:</strong>
                        <span>{formData.metrics.totalStudents}</span>
                      </div>
                      <div className="info-item">
                        <strong>Total Institutions:</strong>
                        <span>{formData.metrics.totalInstitutions}</span>
                      </div>
                      <div className="info-item">
                        <strong>Total Companies:</strong>
                        <span>{formData.metrics.totalCompanies}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button 
                    className="btn-warning"
                    onClick={() => handleDownloadReport(formData.id)}
                  >
                    Download Report
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}