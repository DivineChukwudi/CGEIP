import React, { useState } from 'react';
import { FaFileUpload, FaSpinner, FaTimes, FaCheckCircle } from 'react-icons/fa';

export default function CVUploadModal({ onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [cvUrl, setCvUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cvUrl.trim()) {
      setError('Please provide a CV URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(cvUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('cvUrl', cvUrl);
      formData.append('coverLetter', coverLetter);
      formData.append('additionalInfo', additionalInfo);

      await onSubmit(formData);
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit CV');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FaCheckCircle size={48} style={{ color: '#10b981', marginBottom: '20px' }} />
          <h2>CV Submitted Successfully! ✅</h2>
          <p>Your CV has been saved. You can now browse and apply for jobs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Upload Your CV for Job Applications</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <FaTimes />
          </button>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
          <strong style={{ color: '#047857' }}>📋 Job Application Requirements</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#4b5563' }}>
            CV URL is required. Cover letter and additional info are optional but recommended to improve your chances.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: CV URL */}
          <div className="form-group">
            <label htmlFor="cvUrl">CV URL * <span style={{ fontSize: '12px', color: '#666' }}>(Required)</span></label>
            <input
              id="cvUrl"
              type="url"
              placeholder="https://drive.google.com/file/d/... or https://example.com/cv.pdf"
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            <small style={{ color: '#6b7280', marginTop: '5px', display: 'block' }}>
              📎 You can use:
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Google Drive (share link)</li>
                <li>Dropbox (share link)</li>
                <li>OneDrive (share link)</li>
                <li>Your personal portfolio/website</li>
                <li>PDF hosting service</li>
              </ul>
            </small>
          </div>

          {/* Step 2: Cover Letter (Optional) */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="coverLetter">Cover Letter <span style={{ fontSize: '12px', color: '#999' }}>(Optional)</span></label>
            <textarea
              id="coverLetter"
              rows="5"
              placeholder="Tell employers why you're a great fit for their position. Share your motivations and relevant experience..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small style={{ color: '#6b7280', marginTop: '5px', display: 'block' }}>
              💡 Tip: A personalized cover letter can significantly improve your chances
            </small>
          </div>

          {/* Step 3: Additional Info (Optional) */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="additionalInfo">Additional Information <span style={{ fontSize: '12px', color: '#999' }}>(Optional)</span></label>
            <textarea
              id="additionalInfo"
              rows="3"
              placeholder="Links to portfolio, GitHub, LinkedIn, certificates, or any other relevant information..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small style={{ color: '#6b7280', marginTop: '5px', display: 'block' }}>
              🔗 Examples: LinkedIn profile, GitHub repo, portfolio website, certifications
            </small>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                backgroundColor: submitting ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting && <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />}
              {submitting ? 'Saving...' : 'Save CV & Apply for Jobs'}
            </button>
          </div>
        </form>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
