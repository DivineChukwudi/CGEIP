// client/src/pages/TeamManagement.jsx - FIXED
import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaLinkedin, FaGithub, FaEnvelope, FaUser } from 'react-icons/fa';
import '../styles/TeamManagement.css';

export default function TeamManagement({ user, onUpdate }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    photo: '',
    linkedin: '',
    github: '',
    email: '',
    order: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamMembers();
  }, []); // Fixed: Removed the eslint-disable comment

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/team', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      
      const data = await response.json();
      setTeamMembers(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setError('');
    } catch (err) {
      console.error('Error loading team:', err);
      setError('Failed to load team members: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      role: '',
      bio: '',
      photo: '',
      linkedin: '',
      github: '',
      email: '',
      order: teamMembers.length
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      role: member.role || '',
      bio: member.bio || '',
      photo: member.photo || '',
      linkedin: member.linkedin || '',
      github: member.github || '',
      email: member.email || '',
      order: member.order || 0
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const url = editingMember 
        ? `http://localhost:5000/api/admin/team/${editingMember.id}`
        : 'http://localhost:5000/api/admin/team';
      
      const method = editingMember ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save member');
      }

      setSuccess(editingMember ? 'Member updated successfully!' : 'Member added successfully!');
      setShowModal(false);
      await loadTeamMembers();
      if (onUpdate) onUpdate();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving member:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/admin/team/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete member');
        }

        setSuccess('Member deleted successfully!');
        await loadTeamMembers();
        if (onUpdate) onUpdate();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error deleting member:', err);
        setError(err.message);
      }
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content" style={{ marginLeft: 0 }}>
        <div className="dashboard-header">
          <h1>Team Management</h1>
          <button className="btn-primary" onClick={handleAddMember}>
            <FaPlus /> Add Team Member
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {loading ? (
          <div className="loading-message">Loading team members...</div>
        ) : teamMembers.length === 0 ? (
          <div className="no-members">
            <p>No team members yet. Click "Add Team Member" to get started.</p>
          </div>
        ) : (
          <div className="team-grid">
            {teamMembers.map((member) => (
              <div key={member.id} className="team-card">
                <div className="team-card-image">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} />
                  ) : (
                    <div className="team-card-placeholder">
                      <FaUser />
                    </div>
                  )}
                </div>
                <div className="team-card-content">
                  <h3>{member.name}</h3>
                  <p className="team-role">{member.role}</p>
                  {member.bio && <p className="team-bio">{member.bio}</p>}
                  <div className="team-social">
                    {member.linkedin && (
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                        <FaLinkedin />
                      </a>
                    )}
                    {member.github && (
                      <a href={member.github} target="_blank" rel="noopener noreferrer">
                        <FaGithub />
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`}>
                        <FaEnvelope />
                      </a>
                    )}
                  </div>
                </div>
                <div className="team-card-actions">
                  <button className="btn-icon" onClick={() => handleEditMember(member)}>
                    <FaEdit />
                  </button>
                  <button className="btn-icon danger" onClick={() => handleDelete(member.id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingMember ? 'Edit' : 'Add'} Team Member</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Lead Developer, Designer"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows="3"
                    placeholder="Brief description..."
                  />
                </div>
                <div className="form-group">
                  <label>Photo URL</label>
                  <input
                    type="url"
                    value={formData.photo}
                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  <small>For now, use an image URL. We'll add file upload later.</small>
                </div>
                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="form-group">
                  <label>GitHub</label>
                  <input
                    type="url"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingMember ? 'Update' : 'Add'} Member
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