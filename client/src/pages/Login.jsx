import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { 
  FaGraduationCap, 
  FaEnvelope, 
  FaLock, 
  FaSpinner, 
  FaEye, 
  FaEyeSlash, 
  FaArrowLeft, 
  FaGoogle, 
  FaExclamationTriangle 
} from 'react-icons/fa';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import axios from 'axios';
import '../styles/global.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  // UI states
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // Email verification states
  const [showResendButton, setShowResendButton] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  
  // Google auth states
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);
  const [selectedRole, setSelectedRole] = useState('student');

  // ==================== HANDLERS ====================
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setShowResendButton(false);
    setResendSuccess('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ✅ Handle resending verification email
  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    setResendSuccess('');
    
    try {
      await axios.post(`${API_URL}/auth/resend-verification`, {
        email: unverifiedEmail
      });
      
      setResendSuccess('✅ Verification email sent! Please check your inbox (and spam folder).');
      setShowResendButton(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setResendSuccess('');
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ==================== EMAIL/PASSWORD LOGIN ====================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowResendButton(false);
    setResendSuccess('');

    // ✅ Validate form fields
    if (!formData.email || !formData.email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!formData.password || !formData.password.trim()) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // ✅ FIRST: Authenticate with Firebase to verify password
      console.log('🔐 Authenticating with Firebase...');
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
      const idToken = await userCredential.user.getIdToken();
      
      console.log('✓ Firebase auth successful, getting server token...');

      // ✅ SECOND: Call server with Firebase ID token to get JWT
      const response = await fetch(`${API_URL}/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      console.log('✓ Login response:', data);

      if (!data.user || !data.user.role) {
        throw new Error('Invalid login response - missing user or role');
      }

      const userToSave = {
        ...data.user,
        role: data.user.role
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userToSave));
      
      console.log('✓ Saved to localStorage:', userToSave);
      
      setUser({ ...userToSave, token: data.token });
      
      if (data.warning) {
        console.log('⚠️', data.warning);
      }
      
      console.log(`✓ Navigating to /${userToSave.role}`);
      navigate(`/${userToSave.role}`);

    } catch (err) {
      console.error('✗ Login error:', err);
      
      // Handle Firebase auth errors with friendly messages
      if (err.code === 'auth/user-not-found') {
        setError('Email not found. Please check your email or create an account.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (err.response?.status === 403 && err.response?.data?.emailVerified === false) {
        // Email not verified error from server
        setError(err.response.data.error);
        setShowResendButton(true);
        setUnverifiedEmail(err.response.data.email);
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================== GOOGLE SIGN-IN ====================
  
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    setShowResendButton(false);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();

      try {
        const response = await fetch(`${API_URL}/auth/google-signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });

        const data = await response.json();

        console.log('✓ Google response:', data);

        if (data.requiresRole) {
          setPendingGoogleToken(idToken);
          setShowRoleModal(true);
          setGoogleLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Google sign-in failed');
        }

        if (!data.user || !data.user.role) {
          throw new Error('Invalid response - missing user or role');
        }

        const userToSave = {
          ...data.user,
          role: data.user.role
        };

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userToSave));
        
        console.log('✓ Saved to localStorage:', userToSave);
        
        setUser({ ...userToSave, token: data.token });
        
        console.log(`✓ Navigating to /${userToSave.role}`);
        navigate(`/${userToSave.role}`);

      } catch (apiError) {
        throw apiError;
      }

    } catch (error) {
      console.error('✗ Google sign-in error:', error);
      setError(error.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleRoleSubmit = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/google-signin`, {
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

      console.log('✓ Google signin response:', data);

      if (!data.user || !data.user.role) {
        throw new Error('Invalid response - missing user or role');
      }

      const userToSave = {
        ...data.user,
        role: data.user.role
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userToSave));
      
      console.log('✓ Saved to localStorage:', userToSave);
      
      setUser({ ...userToSave, token: data.token });
      setShowRoleModal(false);
      
      console.log(`✓ Navigating to /${userToSave.role}`);
      navigate(`/${userToSave.role}`);

    } catch (error) {
      console.error('✗ Role submit error:', error);
      setError(error.message || 'Failed to complete sign-in');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ==================== RENDER ====================

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

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <FaExclamationTriangle style={{ marginRight: '8px' }} />
            {error}
          </div>
        )}
        
        {/* Success Message for Resent Email */}
        {resendSuccess && (
          <div className="success-message">
            {resendSuccess}
          </div>
        )}

        {/* ✅ Resend Verification Button */}
        {showResendButton && (
          <div style={{ 
            background: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 15px 0', color: '#856404', fontSize: '14px' }}>
              📧 <strong>Email not verified yet?</strong><br/>
              Click below to receive a new verification email
            </p>
            <button 
              type="button"
              className="btn-secondary"
              onClick={handleResendVerification}
              disabled={resending}
              style={{ width: '100%' }}
            >
              {resending ? (
                <>
                  <FaSpinner className="spinner" /> Sending...
                </>
              ) : (
                <>
                  <FaEnvelope /> Resend Verification Email
                </>
              )}
            </button>
          </div>
        )}

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

        {/* Login Form */}
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

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !formData.email.trim() || !formData.password.trim()}
          >
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

      {/* Role Selection Modal for Google Sign-In */}
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