// client/src/pages/LandingPage.jsx - WITH SEARCH FUNCTIONALITY
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGraduationCap, FaBriefcase, FaBuilding, FaUsers, FaChartLine, FaCheckCircle, FaArrowRight, FaSearch, FaTimes, FaBook } from 'react-icons/fa';
import '../styles/LandingPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // Search function
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Fetch all public data
      const [institutionsRes, facultiesRes, coursesRes] = await Promise.all([
        fetch(`${API_URL}/public/institutions`),
        fetch(`${API_URL}/public/faculties`),
        fetch(`${API_URL}/public/courses`)
      ]);

      const institutions = await institutionsRes.json();
      const faculties = await facultiesRes.json();
      const courses = await coursesRes.json();

      // Filter results based on search query
      const query = searchQuery.toLowerCase();
      
      const filteredInstitutions = institutions.filter(inst =>
        inst.name.toLowerCase().includes(query) ||
        inst.location.toLowerCase().includes(query) ||
        inst.description.toLowerCase().includes(query)
      );

      const filteredFaculties = faculties.filter(fac =>
        fac.name.toLowerCase().includes(query) ||
        fac.description.toLowerCase().includes(query)
      );

      const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.level.toLowerCase().includes(query) ||
        course.requirements.toLowerCase().includes(query)
      );

      setSearchResults({
        institutions: filteredInstitutions,
        faculties: filteredFaculties,
        courses: filteredCourses
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ institutions: [], faculties: [], courses: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const viewDetails = (item, type) => {
    setSelectedItem({ ...item, type });
    setShowModal(true);
  };

  const promptToApply = () => {
    navigate('/register');
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="header-content">
            <div className="logo">
              <FaGraduationCap className="logo-icon" />
              <span>Career Guidance and Employment Integration Platform</span>
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

      {/* Hero Section with Search */}
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

              {/* SEARCH BAR */}
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search institutions, faculties, or courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {searchQuery && (
                      <button 
                        type="button" 
                        className="clear-search"
                        onClick={clearSearch}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                  <button type="submit" className="search-btn" disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </form>
                <p className="search-hint">
                  Try searching: "Engineering", "Diploma", "Business Studies", etc.
                </p>
              </div>

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

      {/* Search Results Section */}
      {searchResults && (
        <section className="search-results-section">
          <div className="landing-container">
            <div className="search-results-header">
              <h2>Search Results for "{searchQuery}"</h2>
              <button className="btn-secondary" onClick={clearSearch}>
                Clear Results
              </button>
            </div>

            {/* Institutions Results */}
            {searchResults.institutions.length > 0 && (
              <div className="results-category">
                <h3><FaBuilding /> Institutions ({searchResults.institutions.length})</h3>
                <div className="results-grid">
                  {searchResults.institutions.map((inst) => (
                    <div key={inst.id} className="result-card">
                      <h4>{inst.name}</h4>
                      <p><strong>Location:</strong> {inst.location}</p>
                      <p>{inst.description.substring(0, 100)}...</p>
                      <button 
                        className="btn-outline-small"
                        onClick={() => viewDetails(inst, 'institution')}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faculties Results */}
            {searchResults.faculties.length > 0 && (
              <div className="results-category">
                <h3><FaGraduationCap /> Faculties ({searchResults.faculties.length})</h3>
                <div className="results-grid">
                  {searchResults.faculties.map((fac) => (
                    <div key={fac.id} className="result-card">
                      <h4>{fac.name}</h4>
                      <p>{fac.description.substring(0, 100)}...</p>
                      <button 
                        className="btn-outline-small"
                        onClick={() => viewDetails(fac, 'faculty')}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courses Results */}
            {searchResults.courses.length > 0 && (
              <div className="results-category">
                <h3><FaBook /> Courses ({searchResults.courses.length})</h3>
                <div className="results-grid">
                  {searchResults.courses.map((course) => (
                    <div key={course.id} className="result-card">
                      <h4>{course.name}</h4>
                      <p><strong>Level:</strong> {course.level}</p>
                      <p><strong>Duration:</strong> {course.duration}</p>
                      <p>{course.description.substring(0, 100)}...</p>
                      <div className="result-actions">
                        <button 
                          className="btn-outline-small"
                          onClick={() => viewDetails(course, 'course')}
                        >
                          View Details
                        </button>
                        <button 
                          className="btn-primary-small"
                          onClick={promptToApply}
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults.institutions.length === 0 && 
             searchResults.faculties.length === 0 && 
             searchResults.courses.length === 0 && (
              <div className="no-results">
                <FaSearch className="no-results-icon" />
                <h3>No results found</h3>
                <p>Try different keywords or browse our institutions below</p>
              </div>
            )}
          </div>
        </section>
      )}

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
                <Link to="/register">Register</Link>
                <Link to="/login">Login</Link>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <Link to="/">About Us</Link>
                <Link to="/">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Details Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay-landing" onClick={() => setShowModal(false)}>
          <div className="modal-content-landing" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <FaTimes />
            </button>
            
            {selectedItem.type === 'institution' && (
              <>
                <h2>{selectedItem.name}</h2>
                <p><strong>Location:</strong> {selectedItem.location}</p>
                <p><strong>Contact:</strong> {selectedItem.contact}</p>
                <p><strong>Website:</strong> <a href={selectedItem.website} target="_blank" rel="noopener noreferrer">{selectedItem.website}</a></p>
                <p>{selectedItem.description}</p>
              </>
            )}

            {selectedItem.type === 'faculty' && (
              <>
                <h2>{selectedItem.name}</h2>
                <p>{selectedItem.description}</p>
              </>
            )}

            {selectedItem.type === 'course' && (
              <>
                <h2>{selectedItem.name}</h2>
                <p><strong>Level:</strong> {selectedItem.level}</p>
                <p><strong>Duration:</strong> {selectedItem.duration}</p>
                <p><strong>Requirements:</strong> {selectedItem.requirements}</p>
                <p><strong>Description:</strong> {selectedItem.description}</p>
                <p><strong>Available Seats:</strong> {selectedItem.enrolledCount || 0} / {selectedItem.capacity}</p>
              </>
            )}

            <div className="modal-actions-landing">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={promptToApply}>
                Register to Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}