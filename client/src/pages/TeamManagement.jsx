// client/src/pages/TeamManagement.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaLinkedin, FaGithub, FaEnvelope, FaUser } from 'react-icons/fa';
import '../styles/global.css';

export default function TeamManagement({ user }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    imageUrl: '',
    linkedin: '',
    github: '',
    email: '',
    order: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      // Replace with actual API call
      const response = await fetch('/api/admin/team', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await response.json();
      setTeamMembers(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      setError('Failed to load team members');
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      role: '',
      bio: '',
      imageUrl: '',
      linkedin: '',
      github: '',
      email: '',
      order: teamMembers.length
    });
    setShowModal(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData(member);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingMember 
        ? `/api/admin/team/${editingMember.id}`
        : '/api/admin/team';
      
      const method = editingMember ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess(editingMember ? 'Member updated!' : 'Member added!');
        setShowModal(false);
        loadTeamMembers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save member');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this team member?')) {
      try {
        await fetch(`/api/admin/team/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        loadTeamMembers();
      } catch (err) {
        setError('Failed to delete member');
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

        <div className="team-grid">
          {teamMembers.map((member) => (
            <div key={member.id} className="team-card">
              <div className="team-card-image">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name} />
                ) : (
                  <div className="team-card-placeholder">
                    <FaUser />
                  </div>
                )}
              </div>
              <div className="team-card-content">
                <h3>{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-bio">{member.bio}</p>
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
                  <label>Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
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
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
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

      <style jsx>{`
        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .team-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s;
        }

        .team-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }

        .team-card-image {
          width: 100%;
          height: 250px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .team-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .team-card-placeholder {
          font-size: 80px;
          color: rgba(255, 255, 255, 0.5);
        }

        .team-card-content {
          padding: 20px;
        }

        .team-card-content h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #333;
        }

        .team-role {
          color: #667eea;
          font-weight: 600;
          margin: 0 0 12px 0;
          font-size: 14px;
        }

        .team-bio {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }

        .team-social {
          display: flex;
          gap: 12px;
        }

        .team-social a {
          color: #667eea;
          font-size: 20px;
          transition: color 0.2s;
        }

        .team-social a:hover {
          color: #764ba2;
        }

        .team-card-actions {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}