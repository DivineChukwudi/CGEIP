// client/src/pages/Register.jsx - COMPLETE VERSION WITH SPAM WARNING
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { FaGraduationCap, FaUser, FaEnvelope, FaLock, FaUserTag, FaSpinner, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import '../styles/global.css';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authAPI.register(registerData);
      
      setSuccess(response.message || 'Registration successful! Please check your email to verify your account.');
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle specific error messages
      let errorMessage = err.message || 'Registration failed. Please try again.';
      
      // Check for duplicate user errors
      if (errorMessage.includes('already exists') || 
          errorMessage.includes('already in use')) {
        errorMessage = 'This email is already registered. Please login or use a different email.';
      }
      
      // Check for Firebase errors
      if (errorMessage.includes('email address is badly formatted')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      if (errorMessage.includes('weak-password')) {
        errorMessage = 'Password should be at least 6 characters.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/" className="auth-back-btn">
        <FaArrowLeft /> Back to Home
      </Link>
      
      <div className="auth-card">
        <div className="auth-header">
          <FaGraduationCap className="auth-icon" />
          <h1>Career Guidance Portal</h1>
          <p>Create your account</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            {error.includes('already registered') && (
              <div style={{ marginTop: '10px' }}>
                <Link to="/login" style={{ color: '#721c24', textDecoration: 'underline' }}>
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            {success}
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              background: '#fff3cd', 
              border: '1px solid #ffc107',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#856404' }}>
                📧 Check your email inbox
              </p>
              <p style={{ margin: '0', color: '#856404' }}>
                If you don't see the verification email, <strong>please check your spam/junk folder</strong>. 
                Mark it as "Not Spam" to ensure you receive future emails.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">
              <FaUser /> Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope /> Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">
              <FaUserTag /> Register As
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="student">Student</option>
              <option value="institution">Institution</option>
              <option value="company">Company</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock /> Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password (min. 6 characters)"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaLock /> Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
                disabled={loading}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="spinner" /> Registering...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}