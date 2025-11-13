import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { FaGraduationCap, FaUser, FaEnvelope, FaLock, FaUserTag, FaSpinner, FaEye, FaEyeSlash, FaArrowLeft, FaGoogle } from 'react-icons/fa';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import axios from 'axios';
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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Register() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e) => {
      // Prevent default back behavior and trigger fade animation instead
      e.preventDefault();
      setIsFading(true);
      setTimeout(() => {
        window.history.back();
      }, 800);
    };

    // Add popstate listener for browser back button
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useNavigate();
  
  // Animation state
  const [isFading, setIsFading] = useState(false);
  
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
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);

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

  // Handle Google Sign-Up - Auto-fill name and email
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      
      console.log('Google user signed in:', result.user);

      const email = result.user.email;
      const name = result.user.displayName || email.split('@')[0];

      // Check if user already exists
      try {
        const checkResponse = await axios.post(`${API_BASE_URL}/auth/check-user`, {
          email: email
        });

        if (checkResponse.data.exists) {
          setError('This email is already registered. Please login instead.');
          setGoogleLoading(false);
          return;
        }
      } catch (checkError) {
        // If check endpoint doesn't exist, proceed
        console.log('User check endpoint not available, proceeding...');
      }

      // Store Google user info and auto-fill form
      setGoogleUserInfo(result.user);
      setIsGoogleUser(true);
      setFormData({
        ...formData,
        name: name,
        email: email
      });
      
      setGoogleLoading(false);
      
      // Show success message
      setSuccess('Google account connected! Please select your role and create a password to complete registration.');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
        
    } catch (error) {
      console.error('Google sign-up error:', error);
      setError(error.message || 'Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    console.log('Submitting registration form');

    // ✅ Validate all required fields
    if (!formData.name || !formData.name.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (!formData.email || !formData.email.trim()) {
      setError('Please enter your email address');
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

    if (!formData.password || !formData.password.trim()) {
      setError('Please enter a password');
      setLoading(false);
      return;
    }

    if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
      setError('Please confirm your password');
      setLoading(false);
      return;
    }

    if (!formData.role || !formData.role.trim()) {
      setError('Please select an account type');
      setLoading(false);
      return;
    }

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
      
      console.log('Sending registration data:', {
        name: registerData.name,
        email: registerData.email,
        role: registerData.role,
        hasPassword: !!registerData.password,
        isGoogleUser: isGoogleUser
      });

      // If using Google, include the Firebase user info
      if (isGoogleUser && googleUserInfo) {
        const idToken = await googleUserInfo.getIdToken();
        
        // Complete Google registration with selected role and password
        const response = await axios.post(`${API_BASE_URL}/auth/google-complete-registration`, {
          idToken,
          role: registerData.role,
          password: registerData.password,
          name: registerData.name
        });

        console.log('Google registration completed:', response.data);

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        setSuccess('Registration successful! Redirecting...');
        
        setTimeout(() => {
          switch (response.data.user.role) {
            case 'student':
              navigate('/student');
              break;
            case 'institution':
              navigate('/institution');
              break;
            case 'company':
              navigate('/company');
              break;
            default:
              navigate('/login');
          }
        }, 1500);
      } else {
        // Normal email/password registration
        const response = await authAPI.register(registerData);
        
        console.log('Registration response:', response);

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
      }
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      
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

  const handleBackToHome = (e) => {
    e.preventDefault();
    setIsFading(true);
    setTimeout(() => {
      navigate('/');
    }, 800); // Match the animation duration (800ms)
  };

  return (
    <div className={`auth-container ${isFading ? 'fade-out' : 'page-fade-in'}`}>
      <a 
        href="/"
        className="auth-back-btn"
        onClick={handleBackToHome}
      >
        <FaArrowLeft /> Back to Home
      </a>
      
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
            {!isGoogleUser && (
              <div style={{ 
                marginTop: '15px', 
                padding: '12px', 
                background: '#fff3cd', 
                border: '1px solid #ffc107',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#856404' }}>
                  Check your email inbox
                </p>
                <p style={{ margin: '0', color: '#856404' }}>
                  If you don't see the verification email, <strong>please check your spam/junk folder</strong>. 
                  Mark it as "Not Spam" to ensure you receive future emails.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Google Sign-Up Button */}
        <button 
          type="button"
          className="btn-google"
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading || isGoogleUser}
        >
          {googleLoading ? (
            <>
              <FaSpinner className="spinner" /> Connecting to Google...
            </>
          ) : isGoogleUser ? (
            <>
              <FaGoogle /> Google Account Connected
            </>
          ) : (
            <>
              <FaGoogle /> Sign up with Google
            </>
          )}
        </button>

        {isGoogleUser && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaGoogle style={{ color: '#10b981' }} />
            <span>Google account connected! Name and email have been auto-filled from your Google account.</span>
          </div>
        )}

        <div className="divider">
          <span>{isGoogleUser ? 'Complete your registration' : 'or'}</span>
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
              disabled={loading || googleLoading || isGoogleUser}
              style={isGoogleUser ? { background: '#f0f0f0', cursor: 'not-allowed' } : {}}
            />
            {isGoogleUser && (
              <small style={{ color: '#10b981', fontSize: '12px' }}>
                ✓ Auto-filled from Google account
              </small>
            )}
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
              disabled={loading || googleLoading || isGoogleUser}
              style={isGoogleUser ? { background: '#f0f0f0', cursor: 'not-allowed' } : {}}
            />
            {isGoogleUser && (
              <small style={{ color: '#10b981', fontSize: '12px' }}>
                ✓ Auto-filled from Google account
              </small>
            )}
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

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || googleLoading || !formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim() || !formData.role.trim()}
          >
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