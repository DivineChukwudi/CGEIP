import React from 'react';
import { FaBriefcase, FaUsers, FaCheckCircle, FaArrowRight, FaChartBar, FaTrophy, FaRocket } from 'react-icons/fa';
import '../styles/landing.css';

export default function CompanyLanding({ user, onNavigate }) {
  return (
    <div className="landing-container company-landing" style={{ display: 'block', position: 'relative', zIndex: 10 }}>
      {/* Hero Section */}
      <div className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome, <span className="highlight">{user?.displayName || 'Company'}</span>!
          </h1>
          <p className="hero-subtitle">
            Find talented candidates and manage your hiring pipeline efficiently
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="landing-stats">
        <div className="stat-card">
          <div className="stat-icon education">
            <FaBriefcase />
          </div>
          <h3>Post Jobs</h3>
          <p>Create job postings with skills, industries, and qualifications. Reach pre-vetted candidates instantly</p>
          <button className="stat-btn" onClick={() => onNavigate('jobs')}>
            Post a Job <FaArrowRight />
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon jobs">
            <FaUsers />
          </div>
          <h3>View Applicants</h3>
          <p>Auto-scored candidates ranked by qualification. Interview-ready candidates marked with green badge</p>
          <button className="stat-btn" onClick={() => onNavigate('applicants')}>
            Review Applicants <FaArrowRight />
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon upload">
            <FaChartBar />
          </div>
          <h3>Track Pipeline</h3>
          <p>Monitor your hiring pipeline with real-time statistics and candidate progress tracking</p>
          <button className="stat-btn" onClick={() => onNavigate('dashboard')}>
            View Analytics <FaArrowRight />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="landing-features">
        <h2>Why CGEIP?</h2>
        
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-number">1</div>
            <h4>Smart Matching</h4>
            <p>Our algorithm matches your job requirements against student qualifications. You get pre-filtered candidates who actually fit your needs.</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">2</div>
            <h4>Auto-Scored Candidates</h4>
            <p>Every candidate gets a qualification score (0-100%) based on academic background, experience, and skill relevance. ≥70% = interview-ready.</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">3</div>
            <h4>Qualified Talent Pool</h4>
            <p>Access students who are actively looking for jobs and have already filled in their preferences. No cold outreach needed.</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">4</div>
            <h4>Real-Time Updates</h4>
            <p>Get instant notifications when candidates apply. Track application status and manage your entire hiring funnel from one dashboard.</p>
          </div>
        </div>
      </div>

      {/* Job Details Section */}
      <div className="landing-details">
        <h2>What to Include in Your Job Posting</h2>
        <div className="details-grid">
          <div className="detail-card">
            <h4>📝 Job Details</h4>
            <ul>
              <li>Job title and description</li>
              <li>Location and work type (remote/hybrid/on-site)</li>
              <li>Salary range</li>
              <li>Application deadline</li>
            </ul>
          </div>
          <div className="detail-card">
            <h4>🎯 Requirements</h4>
            <ul>
              <li>Required skills (we'll fuzzy-match them)</li>
              <li>Experience level</li>
              <li>Industry focus</li>
              <li>Preferred qualifications</li>
            </ul>
          </div>
          <div className="detail-card">
            <h4>⚡ Smart Filtering</h4>
            <ul>
              <li>Automatic candidate scoring</li>
              <li>Skill equivalence matching</li>
              <li>Qualification ranking</li>
              <li>Interview-ready filter</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="landing-cta">
        <div className="cta-content">
          <h2>⚡ Ready to Hire?</h2>
          <p>
            <strong>Post your first job now!</strong> Specify the industries, job types, and skills you need. Our algorithm will find matching candidates from our pool of active job seekers. You'll receive notifications as they apply.
          </p>
          <button className="cta-btn" onClick={() => onNavigate('jobs')}>
            Create Job Posting <FaRocket />
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="landing-shortcuts">
        <h3>Quick Access</h3>
        <div className="shortcuts-grid">
          <button className="shortcut-btn" onClick={() => onNavigate('jobs')}>
            <FaBriefcase /> Post Job
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('applicants')}>
            <FaUsers /> View Applicants
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('profile')}>
            <FaTrophy /> Company Profile
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('notifications')}>
            <FaCheckCircle /> Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
