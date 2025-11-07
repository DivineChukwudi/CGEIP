// client/src/pages/EmailVerification.jsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaEnvelope } from 'react-icons/fa';
import '../styles/global.css';

// Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    const token = searchParams.get('token');
    const uid = searchParams.get('uid');

    if (!token || !uid) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email or request a new verification link.');
      setLoading(false);
      return;
    }

    try {
      // Use API_URL from environment variable
      const response = await fetch(
        `${API_URL}/auth/verify-email/${token}?uid=${uid}`
      );
      
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred during verification. Please try again later.');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    // You can implement resend functionality here
    alert('Please contact support to resend verification email.');
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          {loading && <FaSpinner className="auth-icon spinner" />}
          {status === 'success' && <FaCheckCircle className="auth-icon" style={{ color: '#28a745' }} />}
          {status === 'error' && <FaTimesCircle className="auth-icon" style={{ color: '#dc3545' }} />}
          
          <h1>Email Verification</h1>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Verifying your email address...</p>
          </div>
        )}

        {!loading && status === 'success' && (
          <div className="success-message">
            <p>{message}</p>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Redirecting to login page in 3 seconds...
            </p>
          </div>
        )}

        {!loading && status === 'error' && (
          <>
            <div className="error-message">
              <p>{message}</p>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '15px' }}>Need help?</p>
              <Link to="/login" className="btn-primary" style={{ 
                display: 'inline-block', 
                textDecoration: 'none',
                marginBottom: '10px'
              }}>
                Go to Login
              </Link>
              <br />
              <Link to="/register" style={{ 
                color: '#667eea', 
                fontSize: '14px',
                textDecoration: 'none'
              }}>
                Register New Account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}