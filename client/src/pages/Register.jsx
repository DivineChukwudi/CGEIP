// client/src/pages/Register.jsx - WITH GOOGLE SIGN-IN
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { FaGraduationCap, FaUser, FaEnvelope, FaLock, FaUserTag, FaSpinner, FaEye, FaEyeSlash, FaArrowLeft, FaGoogle } from 'react-icons/fa';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import '../styles/global.css';

// Initialize Firebase for Google Auth
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
};

let firebaseAuth;
try {
  const app = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
} catch (error) {
  console.log('Firebase already initialized');
  firebaseAuth = getAuth();
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);
  const [selectedRole, setSelectedRole] = useState('student');

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
      
      let errorMessage = err.message || 'Registration failed. Please try again.';
      
      if (errorMessage.includes('already exists') || 
          errorMessage.includes('already in use')) {
        errorMessage = 'This email is already registered. Please login or use a different email.';
      }
      
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

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();

      // Always show role selection for new Google users during registration
      setPendingGoogleToken(idToken);
      setShowRoleModal(true);
      setGoogleLoading(false);

    } catch (error) {
      console.error('Google sign-up error:', error);
      setError(error.message || 'Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleRoleSubmit = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/google-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken: pendingGoogleToken,
          role: selectedRole 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google sign-up failed');
      }

      setSuccess('Account created successfully! Redirecting...');
      setShowRoleModal(false);

      // Redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setError(error.message || 'Failed to complete registration');
    } finally {
      setGoogleLoading(false);
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

        {/* Google Sign-Up Button */}
        <button 
          type="button"
          className="btn-google"
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <>
              <FaSpinner className="spinner" /> Signing up...
            </>
          ) : (
            <>
              <FaGoogle /> Sign up with Google
            </>
          )}
        </button>

        <div className="divider">
          <span>or</span>
        </div>

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
              disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
                disabled={loading || googleLoading}
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
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
                disabled={loading || googleLoading}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading || googleLoading}>
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

      {/* Role Selection Modal for Google Sign-Up */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => !googleLoading && setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Select Account Type</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Please select what type of account you want to create:
            </p>
            
            <div className="role-selection">
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={selectedRole === 'student'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={googleLoading}
                />
                <div className="role-details">
                  <strong>Student</strong>
                  <span>Apply for courses and find job opportunities</span>
                </div>
              </label>

              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="institution"
                  checked={selectedRole === 'institution'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={googleLoading}
                />
                <div className="role-details">
                  <strong>Institution</strong>
                  <span>Manage courses and student applications</span>
                </div>
              </label>

              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="company"
                  checked={selectedRole === 'company'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={googleLoading}
                />
                <div className="role-details">
                  <strong>Company</strong>
                  <span>Post jobs and find qualified candidates</span>
                </div>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setShowRoleModal(false);
                  setGoogleLoading(false);
                }}
                disabled={googleLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary"
                onClick={handleRoleSubmit}
                disabled={googleLoading}
              >
                {googleLoading ? <><FaSpinner className="spinner" /> Creating...</> : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}