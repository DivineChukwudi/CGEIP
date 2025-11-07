// client/src/pages/MeetTheTeam.jsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLinkedin, FaGithub, FaEnvelope, FaUser, FaArrowLeft } from 'react-icons/fa';
import { buildApiUrl } from '../utils/config';
import '../styles/MeetTheTeam.css';

export default function MeetTheTeam() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch(buildApiUrl('api/public/team'));
        
        if (!response.ok) {
          throw new Error('Failed to fetch team members');
        }
        
        const data = await response.json();
        setMembers(data);
        setError('');
      } catch (err) {
        console.error('Error fetching team:', err);
        setError('Failed to load team members. Please try again later.');
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
          <p>The talented individuals behind Limkokwing Career Portal</p>
        </header>

        {loading ? (
          <div className="loading-state">
            <p>Loading team members...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="no-members">
            <p>Team information coming soon...</p>
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