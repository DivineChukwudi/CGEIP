import React from 'react';
import { FaBriefcase, FaGraduationCap, FaFileUpload, FaCheckCircle, FaArrowRight, FaBell } from 'react-icons/fa';
import '../styles/landing.css';

export default function StudentLanding({ user, onNavigate }) {
  return (
    <div className="landing-container student-landing" style={{ display: 'block', position: 'relative', zIndex: 10 }}>
      {/* Hero Section */}
      <div className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome back, <span className="highlight">{user?.displayName?.split(' ')[0] || 'Student'}</span>!
          </h1>
          <p className="hero-subtitle">
            Your gateway to amazing career opportunities and academic excellence
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="landing-stats">
        <div className="stat-card">
          <div className="stat-icon education">
            <FaGraduationCap />
          </div>
          <h3>Explore Institutions</h3>
          <p>Browse quality institutions and apply to programs that match your goals</p>
          <button className="stat-btn" onClick={() => onNavigate('institutions')}>
            Get Started <FaArrowRight />
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon jobs">
            <FaBriefcase />
          </div>
          <h3>Job Opportunities</h3>
          <p>Discover jobs that match your skills and interests with smart matching</p>
          <button className="stat-btn" onClick={() => onNavigate('jobs')}>
            Browse Jobs <FaArrowRight />
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon upload">
            <FaFileUpload />
          </div>
          <h3>Build Your Profile</h3>
          <p>Upload your CV, transcript, and set preferences to get better matches</p>
          <button className="stat-btn" onClick={() => onNavigate('profile')}>
            Update Profile <FaArrowRight />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="landing-features">
        <h2>How It Works</h2>
        
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-number">1</div>
            <h4>Complete Your Profile</h4>
            <p>Add your transcript, CV, and job preferences. The more details you provide, the better our smart matching algorithm works.</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">2</div>
            <h4>Set Job Preferences</h4>
            <p>Tell us what industries, job types, and skills matter to you. We'll keep reminding you until you fill this out!</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">3</div>
            <h4>Smart Recommendations</h4>
            <p>Get personalized job and program recommendations based on your qualifications and preferences. We run matching every 10 minutes!</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">4</div>
            <h4>Track Applications</h4>
            <p>Monitor all your applications in one place. See real-time status updates and qualification scores for each opportunity.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="landing-cta">
        <div className="cta-content">
          <h2>Pro Tip</h2>
          <p>
            <strong>Set your job preferences</strong> to unlock smart matching! Our AI algorithm analyzes job postings every 10 minutes and finds matches for you. You'll get notifications every 3 hours if you haven't completed your preferences.
          </p>
          <button className="cta-btn" onClick={() => onNavigate('job-interests')}>
            Set Job Preferences Now <FaBell />
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="landing-shortcuts">
        <h3>Quick Access</h3>
        <div className="shortcuts-grid">
          <button className="shortcut-btn" onClick={() => onNavigate('my-applications')}>
            <FaCheckCircle /> My Applications
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('my-jobs')}>
            <FaBriefcase /> Saved Jobs
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('my-transcript')}>
            <FaFileUpload /> My Transcript
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('notifications')}>
            <FaBell /> Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
