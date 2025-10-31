// client/src/components/Navbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaGraduationCap } from 'react-icons/fa';

export default function Navbar({ user, logout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleNames = {
    admin: 'Admin',
    institution: 'Institution',
    student: 'Student',
    company: 'Company',
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <FaGraduationCap className="navbar-icon" />
          <span>Limkokwing Career Portal</span>
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <FaUser className="user-icon" />
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{roleNames[user.role]}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}