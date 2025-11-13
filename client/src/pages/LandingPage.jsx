import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGraduationCap, FaBriefcase, FaBuilding, FaUsers, FaChartLine, FaCheckCircle, FaArrowRight, FaSearch, FaTimes, FaBook, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGlobe, FaEye, FaBullseye, FaHeart, FaHistory, FaPaperPlane } from 'react-icons/fa';
import '../styles/LandingPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState('');

  // Refs for scrolling
  const aboutRef = useRef(null);
  const contactRef = useRef(null);

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
      const [institutionsRes, facultiesRes, coursesRes] = await Promise.all([
        fetch(`${API_URL}/public/institutions`),
        fetch(`${API_URL}/public/faculties`),
        fetch(`${API_URL}/public/courses`)
      ]);

      const institutions = await institutionsRes.json();
      const faculties = await facultiesRes.json();
      const courses = await coursesRes.json();

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

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle contact form
  const handleContactChange = (e) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('sending');

    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm)
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus('success');
        setContactForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setFormStatus(''), 5000);
      } else {
        setFormStatus('error');
        console.error('Contact form error:', data.error);
        setTimeout(() => setFormStatus(''), 5000);
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      setFormStatus('error');
      setTimeout(() => setFormStatus(''), 5000);
    }
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="header-content">
            <div className="logo">
              <FaGraduationCap className="logo-icon" />
              <span>CGEIP</span>
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

      {/* ABOUT US SECTION */}
      <section className="about-section" ref={aboutRef}>
        <div className="landing-container">
          <div className="section-header-center">
            <h2>About Us</h2>
            <p>Empowering Education and Career Development in Lesotho</p>
          </div>

          <div className="about-content">
            {/* Our Story */}
            <div className="about-story">
              <div className="about-icon-header">
                <FaHistory className="about-section-icon" />
                <h3>Our Story</h3>
              </div>
              <p>
                Founded in 2024, the Career Guidance and Employment Integration Platform (CGEIP) 
                was established to bridge the gap between education and employment in Lesotho. 
                Recognizing the challenges students face in accessing information about higher 
                learning institutions and the disconnect between graduates and employers, we created 
                a comprehensive digital solution.
              </p>
              <p>
                Developed in collaboration with Limkokwing University of Creative Technology Lesotho, 
                our platform represents a commitment to innovation in education technology and career 
                development. We serve as a central hub connecting students, educational institutions, 
                and employers across the Kingdom of Lesotho.
              </p>
            </div>

            {/* Vision, Mission, Values Grid */}
            <div className="about-vmv-grid">
              <div className="vmv-card">
                <FaEye className="vmv-icon" />
                <h3>Our Vision</h3>
                <p>
                  To be the leading digital platform in Lesotho that seamlessly connects education 
                  with employment, ensuring every student has access to quality educational 
                  opportunities and career pathways.
                </p>
              </div>

              <div className="vmv-card">
                <FaBullseye className="vmv-icon" />
                <h3>Our Mission</h3>
                <p>
                  To empower students through accessible information, streamline institutional 
                  processes, and facilitate meaningful connections between graduates and employers, 
                  thereby contributing to Lesotho's socio-economic development.
                </p>
              </div>

              <div className="vmv-card">
                <FaHeart className="vmv-icon" />
                <h3>Our Values</h3>
                <ul className="values-list">
                  <li><FaCheckCircle /> <span>Accessibility - Education for all</span></li>
                  <li><FaCheckCircle /> <span>Innovation - Technology-driven solutions</span></li>
                  <li><FaCheckCircle /> <span>Integrity - Transparent processes</span></li>
                  <li><FaCheckCircle /> <span>Excellence - Quality service delivery</span></li>
                  <li><FaCheckCircle /> <span>Collaboration - Partnerships for growth</span></li>
                </ul>
              </div>
            </div>

            {/* Motto */}
            <div className="about-motto">
              <div className="motto-content">
                <h3>Our Motto</h3>
                <p className="motto-text">"Connecting Dreams to Opportunities"</p>
                <p className="motto-description">
                  We believe every student's educational dream can become a reality, and every 
                  graduate can find meaningful employment. Our platform is the bridge that makes 
                  this possible.
                </p>
              </div>
            </div>

            {/* What We Do */}
            <div className="about-services">
              <h3>What We Do</h3>
              <div className="services-grid">
                <div className="service-item">
                  <FaGraduationCap />
                  <h4>For Students</h4>
                  <p>Discover institutions, apply for courses, track applications, and access career opportunities</p>
                </div>
                <div className="service-item">
                  <FaBuilding />
                  <h4>For Institutions</h4>
                  <p>Manage admissions, publish courses, track applicants, and streamline enrollment processes</p>
                </div>
                <div className="service-item">
                  <FaBriefcase />
                  <h4>For Employers</h4>
                  <p>Post job opportunities, access qualified candidates, and build your workforce</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT US SECTION */}
      <section className="contact-section" ref={contactRef}>
        <div className="landing-container">
          <div className="section-header-center">
            <h2>Contact Us</h2>
            <p>Get in touch with us - we're here to help</p>
          </div>

          <div className="contact-content">
            {/* Contact Information */}
            <div className="contact-info">
              <h3>Get In Touch</h3>
              <p className="contact-intro">
                Have questions or need assistance? Reach out to us through any of the following channels:
              </p>

              <div className="contact-details">
                <div className="contact-item">
                  <FaMapMarkerAlt className="contact-icon" />
                  <div>
                    <h4>Address</h4>
                    <p>Limkokwing University of Creative Technology</p>
                    <p>Maseru, Lesotho</p>
                    <p>P.O. Box 11912</p>
                  </div>
                </div>

                <div className="contact-item">
                  <FaPhone className="contact-icon" />
                  <div>
                    <h4>Phone</h4>
                    <p>+266 2231 2211</p>
                    <p>Ext: 117</p>
                  </div>
                </div>

                <div className="contact-item">
                  <FaEnvelope className="contact-icon" />
                  <div>
                    <h4>Email</h4>
                    <p>limkokwing.ac.ls</p>
                    <p>info@che.ac.ls</p>
                  </div>
                </div>

                <div className="contact-item">
                  <FaGlobe className="contact-icon" />
                  <div>
                    <h4>Website</h4>
                    <p><a href="https://www.limkokwing.ac.ls" target="_blank" rel="noopener noreferrer">www.limkokwing.ac.ls</a></p>
                  </div>
                </div>
              </div>

              <div className="office-hours">
                <h4>Office Hours</h4>
                <p>Monday - Friday: 8:00 AM - 5:00 PM</p>
                <p>Saturday: 9:00 AM - 1:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <h3>Send Us a Message</h3>
              <p>Fill out the form below and we'll get back to you as soon as possible</p>

              {formStatus === 'success' && (
    <div className="form-success-message">
      <FaCheckCircle /> Your message has been sent successfully! We'll get back to you soon.
    </div>
  )}

  {formStatus === 'error' && (
    <div className="form-error-message">
      <FaTimes /> Failed to send message. Please try again or contact us directly via email.
    </div>
  )}

  {formStatus === 'sending' && (
    <div className="form-sending-message">
      <FaPaperPlane /> Sending your message...
    </div>
  )}

  <form onSubmit={handleContactSubmit} className={`contact-form ${formStatus === 'sending' ? 'sending' : ''}`}>
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    required
                    placeholder="What is your message about?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactChange}
                    required
                    rows="6"
                    placeholder="Type your message here..."
                  ></textarea>
                </div>

                <button type="submit" className="btn-primary btn-large">
                  <FaPaperPlane /> Send Message
                </button>
              </form>
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
                <span>Career Guidance and Employment Integration Platform</span>
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
                <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection(aboutRef); }}>About Us</a>
                <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection(contactRef); }}>Contact</a>
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