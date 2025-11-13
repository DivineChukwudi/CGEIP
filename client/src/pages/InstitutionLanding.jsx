import React from 'react';
import { FaBook, FaUsers, FaChartBar, FaCheckCircle, FaArrowRight, FaGraduationCap, FaBullhorn } from 'react-icons/fa';
import '../styles/landing.css';

export default function InstitutionLanding({ user, onNavigate }) {
  return (
    <div className="landing-container institution-landing" style={{ display: 'block', position: 'relative', zIndex: 10 }}>
      {/* Hero Section */}
      <div className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome, <span className="highlight">{user?.displayName || 'Institution'}</span>!
          </h1>
          <p className="hero-subtitle">
            Manage your academic programs, admissions, and student applications efficiently
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="landing-stats">
        <div className="stat-card">
          <div className="stat-icon education">
            <FaBook />
          </div>
          <h3>Manage Programs</h3>
          <p>Create and manage faculties and courses with detailed requirements and qualifications</p>
          <button className="stat-btn" onClick={() => onNavigate('courses')}>
            View Programs <FaArrowRight />
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon jobs">
            <FaUsers />
          </div>
          <h3>Review Applications</h3>
          <p>Auto-scored candidates sorted by qualification. Filter interview-ready applicants (≥70%)</p>
          <button className="stat-btn" onClick={() => onNavigate('applications')}>
            Review Apps <FaArrowRight />
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon upload">
            <FaChartBar />
          </div>
          <h3>Analytics & Insights</h3>
          <p>Get real-time statistics on applications, admissions, and program popularity</p>
          <button className="stat-btn" onClick={() => onNavigate('dashboard')}>
            View Dashboard <FaArrowRight />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="landing-features">
        <h2>Key Capabilities</h2>
        
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-number">1</div>
            <h4>Academic Structure</h4>
            <p>Organize your institution into faculties (like Engineering, Business) and create multiple courses within each faculty.</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">2</div>
            <h4>Smart Application Scoring</h4>
            <p>Candidates are automatically scored on 4 factors: academics (30%), certificates (20%), experience (25%), and relevance (25%).</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">3</div>
            <h4>Instant Qualification Filter</h4>
            <p>See interview-ready candidates at a glance. Green badge = ≥70% qualified. Easily filter by score and course.</p>
          </div>

          <div className="feature-item">
            <div className="feature-number">4</div>
            <h4>Application Management</h4>
            <p>View transcripts, approve/reject applications, and add notes. Track the entire admissions pipeline in one dashboard.</p>
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="landing-process">
        <h2>Your Workflow</h2>
        <div className="process-flow">
          <div className="process-step">
            <div className="process-icon"><FaBook /></div>
            <p>Create Faculties & Courses</p>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="process-icon"><FaUsers /></div>
            <p>Students Apply</p>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="process-icon"><FaCheckCircle /></div>
            <p>Review & Auto-Score</p>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="process-icon"><FaGraduationCap /></div>
            <p>Admit Students</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="landing-cta">
        <div className="cta-content">
          <h2>🚀 Getting Started</h2>
          <p>
            <strong>First time?</strong> Start by setting up your faculties and courses. Students will then be able to discover and apply to your programs. Applications are auto-scored using our intelligent qualification algorithm.
          </p>
          <button className="cta-btn" onClick={() => onNavigate('faculties')}>
            Create First Faculty <FaBullhorn />
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="landing-shortcuts">
        <h3>Quick Access</h3>
        <div className="shortcuts-grid">
          <button className="shortcut-btn" onClick={() => onNavigate('faculties')}>
            <FaBook /> Manage Faculties
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('courses')}>
            <FaGraduationCap /> Create Courses
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('applications')}>
            <FaUsers /> Review Applications
          </button>
          <button className="shortcut-btn" onClick={() => onNavigate('notifications')}>
            <FaBullhorn /> Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
