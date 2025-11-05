// client/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaBriefcase, FaChartBar, FaCheck, FaTimes, FaUsers } from 'react-icons/fa';
import '../styles/global.css';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [institutions, setInstitutions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await adminAPI.getReports();
        setStats(data);
      } else if (activeTab === 'institutions') {
        const data = await adminAPI.getInstitutions();
        setInstitutions(data);
      } else if (activeTab === 'companies') {
        const data = await adminAPI.getCompanies();
        setCompanies(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstitution = () => {
    setModalType('add-institution');
    setFormData({ name: '', description: '', location: '', contact: '', website: '' });
    setShowModal(true);
  };

  const handleSubmitInstitution = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.addInstitution(formData);
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteInstitution = async (id) => {
    if (window.confirm('Are you sure? This will delete all related data.')) {
      try {
        await adminAPI.deleteInstitution(id);
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleUpdateCompanyStatus = async (id, status) => {
    try {
      await adminAPI.updateCompanyStatus(id, status);
      loadData();
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
          className={activeTab === 'institutions' ? 'active' : ''}
          onClick={() => setActiveTab('institutions')}
        >
          <FaBuilding /> Institutions
        </button>
        <button
          className={activeTab === 'companies' ? 'active' : ''}
          onClick={() => setActiveTab('companies')}
        >
          <FaBriefcase /> Companies
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
                        <button className="btn-icon" onClick={() => handleDeleteInstitution(inst.id)}>
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
                            className="btn-success"
                            onClick={() => handleUpdateCompanyStatus(company.id, 'active')}
                          >
                            <FaCheck /> Approve
                          </button>
                        )}
                        {company.status === 'active' && (
                          <button
                            className="btn-warning"
                            onClick={() => handleUpdateCompanyStatus(company.id, 'suspended')}
                          >
                            <FaTimes /> Suspend
                          </button>
                        )}
                        {company.status === 'suspended' && (
                          <button
                            className="btn-success"
                            onClick={() => handleUpdateCompanyStatus(company.id, 'active')}
                          >
                            <FaCheck /> Activate
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

        {showModal && modalType === 'add-institution' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Institution</h2>
              <form onSubmit={handleSubmitInstitution}>
                <div className="form-group">
                  <label>Institution Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  <label>Contact</label>
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
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Institution
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