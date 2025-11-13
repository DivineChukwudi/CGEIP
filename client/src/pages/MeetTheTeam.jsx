import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLinkedin, FaGithub, FaEnvelope, FaUser, FaArrowLeft } from 'react-icons/fa';
import '../styles/MeetTheTeam.css';

export default function MeetTheTeam() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        // Use environment variable or fallback to Render URL
        const API_URL = process.env.REACT_APP_API_URL || 'https://cgeip.onrender.com/api';
        const endpoint = `${API_URL}/public/team`;
        
        console.log('🔍 Fetching team from:', endpoint);
        console.log('📍 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Team data received:', data);
        console.log('📊 Number of members:', data.length);
        
        setMembers(data);
        setError('');
      } catch (err) {
        console.error('❌ Error fetching team:', err);
        console.error('❌ Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        setError(`Failed to load team members: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, []);

  return (
    <div className="meet-team-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <FaArrowLeft /> Back to Home
      </button>

      <div className="team-container">
        <header className="team-header">
          <h1>Meet the Team</h1>
          <p>The talented individuals behind the Career Guidance and Employment Integration Platform</p>
        </header>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" style={{ 
              margin: '40px auto',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p>Loading team members...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button 
              className="btn-primary" 
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px' }}
            >
              Try Again
            </button>
          </div>
        ) : members.length === 0 ? (
          <div className="no-members">
            <h3>No Team Members Yet</h3>
            <p>Team information will be added soon...</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Admin can add team members from the Admin Dashboard → Manage Team
            </p>
          </div>
        ) : (
          <div className="team-members-grid">
            {members.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-image">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} />
                  ) : (
                    <div className="member-placeholder">
                      <FaUser />
                    </div>
                  )}
                </div>
                <div className="member-info">
                  <h2>{member.name}</h2>
                  <p className="member-role">{member.role}</p>
                  {member.bio && <p className="member-bio">{member.bio}</p>}
                  {(member.linkedin || member.github || member.email) && (
                    <div className="member-social">
                      {member.linkedin && (
                        <a 
                          href={member.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          aria-label={`${member.name}'s LinkedIn`}
                        >
                          <FaLinkedin />
                        </a>
                      )}
                      {member.github && (
                        <a 
                          href={member.github} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          aria-label={`${member.name}'s GitHub`}
                        >
                          <FaGithub />
                        </a>
                      )}
                      {member.email && (
                        <a 
                          href={`mailto:${member.email}`}
                          aria-label={`Email ${member.name}`}
                        >
                          <FaEnvelope />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}