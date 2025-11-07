// client/src/pages/Login.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { buildApiUrl } from '../utils/config';
import { FaGraduationCap, FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash, FaArrowLeft, FaGoogle } from 'react-icons/fa';
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

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      
      // Save to localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update app state
      setUser({ ...response.user, token: response.token });
      
      // Show warning if any
      if (response.warning) {
        console.log('⚠️', response.warning);
      }
      
      // Navigate to appropriate dashboard
      navigate(`/${response.user.role}`);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();

      // Try to sign in without role first
      try {
        const response = await fetch(buildApiUrl('api/auth/google-signin'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });

        const data = await response.json();

        if (data.requiresRole) {
          // New user - show role selection modal
          setPendingGoogleToken(idToken);
          setShowRoleModal(true);
          setGoogleLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Google sign-in failed');
        }

        // Existing user - proceed with login
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser({ ...data.user, token: data.token });
        navigate(`/${data.user.role}`);

      } catch (apiError) {
        throw apiError;
      }

    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(error.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleRoleSubmit = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('api/auth/google-signin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken: pendingGoogleToken,
          role: selectedRole 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google sign-in failed');
      }

      // Save and navigate
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser({ ...data.user, token: data.token });
      setShowRoleModal(false);
      navigate(`/${data.user.role}`);

    } catch (error) {
      setError(error.message || 'Failed to complete sign-in');
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
          <p>Login to your account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Google Sign-In Button */}
        <button 
          type="button"
          className="btn-google"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <>
              <FaSpinner className="spinner" /> Signing in...
            </>
          ) : (
            <>
              <FaGoogle /> Continue with Google
            </>
          )}
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
            />
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
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="spinner" /> Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
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
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary"
                onClick={handleRoleSubmit}
                disabled={googleLoading}
              >
                {googleLoading ? <><FaSpinner className="spinner" /> Creating...</> : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}