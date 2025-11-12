// client/src/components/Navbar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaGraduationCap, FaBars, FaTimes } from 'react-icons/fa';

export default function Navbar({ user, logout }) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
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
          <span>CGEIP</span>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-user navbar-desktop">
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

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-toggle navbar-mobile"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="navbar-mobile-menu">
            <div className="mobile-user-info">
              <FaUser className="user-icon" />
              <div>
                <span className="user-name">{user.name}</span>
                <span className="user-role">{roleNames[user.role]}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn logout-btn-mobile">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}