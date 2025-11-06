// client/src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGraduationCap, FaBriefcase, FaBuilding, FaUsers, FaChartLine, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import '../styles/LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaGraduationCap />,
      title: "Discover Institutions",
      description: "Explore higher learning institutions in Lesotho and their comprehensive course offerings"
    },
    {
      icon: <FaBriefcase />,
      title: "Career Opportunities",
      description: "Connect with leading companies and access exclusive job opportunities"
    },
    {
      icon: <FaBuilding />,
      title: "Institution Management",
      description: "Streamlined admission process and student application management"
    },
    {
      icon: <FaUsers />,
      title: "Student Success",
      description: "From application to employment - your complete academic journey"
    }
  ];

  const stats = [
    { number: "10+", label: "Partner Institutions" },
    { number: "50+", label: "Available Courses" },
    { number: "100+", label: "Career Opportunities" },
    { number: "500+", label: "Success Stories" }
  ];

  const benefits = [
    "Apply to multiple institutions seamlessly",
    "Track your application status in real-time",
    "Upload and manage academic documents",
    "Receive job notifications matching your profile",
    "Connect directly with employers",
    "Access comprehensive course information"
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="header-content">
            <div className="logo">
              <FaGraduationCap className="logo-icon" />
              <span>Limkokwing Career Portal</span>
            </div>
            <div className="header-actions">
              <button className="btn-outline" onClick={() => navigate('/login')}>
                Login
              </button>
              <button className="btn-primary" onClick={() => navigate('/register')}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="landing-container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Your Gateway to
                <span className="gradient-text"> Academic Excellence</span>
                <br />and Career Success
              </h1>
              <p className="hero-description">
                Navigate your educational journey and career path with Lesotho's premier 
                platform connecting students, institutions, and employers.
              </p>
              <div className="hero-buttons">
                <button className="btn-large btn-primary" onClick={() => navigate('/register')}>
                  Start Your Journey <FaArrowRight />
                </button>
                <button className="btn-large btn-secondary" onClick={() => navigate('/login')}>
                  Sign In
                </button>
              </div>
            </div>
            <div className="hero-image">
              <div className="floating-card card-1">
                <FaGraduationCap />
                <span>1000+ Students</span>
              </div>
              <div className="floating-card card-2">
                <FaBriefcase />
                <span>500+ Jobs</span>
              </div>
              <div className="floating-card card-3">
                <FaBuilding />
                <span>10+ Institutions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="landing-container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="landing-container">
          <div className="section-header-center">
            <h2>Comprehensive Platform Features</h2>
            <p>Everything you need for educational and career advancement</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="landing-container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2>Why Choose Our Platform?</h2>
              <p className="benefits-intro">
                We provide a seamless, integrated experience for students, institutions, 
                and employers to connect and succeed together.
              </p>
              <div className="benefits-list">
                {benefits.map((benefit, index) => (
                  <div key={index} className="benefit-item">
                    <FaCheckCircle className="check-icon" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary btn-large" onClick={() => navigate('/register')}>
                Join Today <FaArrowRight />
              </button>
            </div>
            <div className="benefits-visual">
              <div className="visual-card">
                <FaChartLine className="visual-icon" />
                <h4>Track Your Progress</h4>
                <p>Monitor applications and career growth</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="landing-container">
          <div className="cta-content">
            <h2>Ready to Transform Your Future?</h2>
            <p>Join thousands of students and professionals advancing their careers</p>
            <button className="btn-large btn-white" onClick={() => navigate('/register')}>
              Create Free Account <FaArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo">
                <FaGraduationCap className="logo-icon" />
                <span>Limkokwing Career Portal</span>
              </div>
              <p>Empowering education and career success in Lesotho</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Platform</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Register</a>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Login</a>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <a href="#">About Us</a>
                <a href="#">Contact</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
           {/* <p>&copy; {new Date().getFullYear()} Limkokwing Career Portal. All rights reserved.</p>*/}
          </div>
        </div>
      </footer>
    </div>
  );
}