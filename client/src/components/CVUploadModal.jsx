import React, { useState } from 'react';
import { FaFileUpload, FaSpinner, FaTimes, FaCheckCircle, FaTrash, FaLink } from 'react-icons/fa';

export default function CVUploadModal({ onClose, onSubmit }) {
  const [cvMethod, setCvMethod] = useState('file'); // 'file' or 'url'
  const [cvFile, setCvFile] = useState(null);
  const [cvUrl, setCvUrl] = useState('');
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const ALLOWED_FORMATS = ['application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text'];
  
  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt', '.txt'];

  const handleCVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FORMATS.includes(file.type) && 
        !ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setError(`Invalid file format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate file size (max 5MB for CV)
    if (file.size > 5 * 1024 * 1024) {
      setError('CV file size must be less than 5MB');
      return;
    }

    setCvFile(file);
    setError('');
  };

  const handleSupportingDocsUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (supportingDocs.length + files.length > 3) {
      setError('Maximum 3 supporting documents allowed');
      return;
    }

    // Validate each file
    const validFiles = files.filter(file => {
      if (!ALLOWED_FORMATS.includes(file.type) && 
          !ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setError(`Invalid file format for ${file.name}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} is too large (max 5MB)`);
        return false;
      }
      
      return true;
    });

    setSupportingDocs([...supportingDocs, ...validFiles]);
    setError('');
  };

  const removeSupportingDoc = (index) => {
    setSupportingDocs(supportingDocs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate CV - either file OR url must be provided
    if (cvMethod === 'file' && !cvFile) {
      setError('Please upload your CV file');
      return;
    }

    if (cvMethod === 'url') {
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
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('cvMethod', cvMethod);
      
      if (cvMethod === 'file') {
        formData.append('cvFile', cvFile);
      } else {
        formData.append('cvUrl', cvUrl);
      }
      
      formData.append('coverLetter', coverLetter);
      
      // Append supporting documents
      supportingDocs.forEach((doc, index) => {
        formData.append(`supportingDoc_${index}`, doc);
      });
      formData.append('supportingDocsCount', supportingDocs.length);

      await onSubmit(formData);
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to upload CV');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FaCheckCircle size={48} style={{ color: '#10b981', marginBottom: '20px' }} />
          <h2>CV Uploaded Successfully! ✅</h2>
          <p>Your CV and documents have been saved. You can now browse and apply for jobs.</p>
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
            CV is required (choose file upload or URL). Cover letter and supporting documents are optional but recommended.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '15px' }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* CV METHOD SELECTOR */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px', display: 'block' }}>
              How would you like to submit your CV? *
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setCvMethod('file');
                  setCvUrl('');
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: cvMethod === 'file' ? '2px solid #10b981' : '2px solid #d1d5db',
                  backgroundColor: cvMethod === 'file' ? '#f0fdf4' : '#f9fafb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: cvMethod === 'file' ? '#047857' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <FaFileUpload /> Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setCvMethod('url');
                  setCvFile(null);
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: cvMethod === 'url' ? '2px solid #667eea' : '2px solid #d1d5db',
                  backgroundColor: cvMethod === 'url' ? '#f0f9ff' : '#f9fafb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: cvMethod === 'url' ? '#1e40af' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <FaLink /> Provide URL
              </button>
            </div>
          </div>

          {/* FILE UPLOAD METHOD */}
          {cvMethod === 'file' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="cvFile">CV File * <span style={{ fontSize: '12px', color: '#666' }}>(Required)</span></label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '30px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#f9fafb',
                transition: 'all 0.3s ease'
              }}>
                <input
                  id="cvFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.odt,.txt"
                  onChange={handleCVUpload}
                  style={{ display: 'none' }}
                />
                {cvFile ? (
                  <div style={{ color: '#10b981' }}>
                    <FaCheckCircle size={32} style={{ marginBottom: '10px' }} />
                    <p style={{ margin: '10px 0 0 0', fontWeight: '600' }}>{cvFile.name}</p>
                    <small>{(cvFile.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>
                ) : (
                  <div
                    onClick={() => document.getElementById('cvFile').click()}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaFileUpload size={32} style={{ color: '#10b981', marginBottom: '10px' }} />
                    <p style={{ margin: '10px 0', fontWeight: '600', color: '#374151' }}>
                      Click to upload or drag and drop
                    </p>
                    <small style={{ color: '#6b7280' }}>PDF, Word (.doc, .docx), ODF (.odt) or Text (.txt) - Max 5MB</small>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL METHOD */}
          {cvMethod === 'url' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="cvUrl">CV URL * <span style={{ fontSize: '12px', color: '#666' }}>(Required)</span></label>
              <input
                id="cvUrl"
                type="url"
                placeholder="https://drive.google.com/file/d/... or https://example.com/cv.pdf"
                value={cvUrl}
                onChange={(e) => {
                  setCvUrl(e.target.value);
                  setError('');
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
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
          )}

          {/* Cover Letter (Optional) */}
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
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#6b7280', marginTop: '5px', display: 'block' }}>
              💡 Tip: A personalized cover letter can significantly improve your chances
            </small>
          </div>

          {/* Supporting Documents (Optional) */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="supportingDocs">Supporting Documents <span style={{ fontSize: '12px', color: '#999' }}>(Optional - Max 3 files)</span></label>
            <div style={{
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f9fafb'
            }}>
              <input
                id="supportingDocs"
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt"
                onChange={handleSupportingDocsUpload}
                multiple
                style={{ display: 'none' }}
              />
              <div
                onClick={() => document.getElementById('supportingDocs').click()}
                style={{ cursor: 'pointer' }}
              >
                <FaFileUpload size={24} style={{ color: '#667eea', marginBottom: '8px' }} />
                <p style={{ margin: '8px 0', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Add supporting documents
                </p>
                <small style={{ color: '#6b7280' }}>Certificates, portfolio excerpts, achievements - Max 3 files</small>
              </div>
            </div>

            {/* List of uploaded supporting docs */}
            {supportingDocs.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '14px' }}>
                  Uploaded Documents ({supportingDocs.length}/3)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {supportingDocs.map((doc, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '6px',
                        borderLeft: '3px solid #667eea'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                          {doc.name}
                        </p>
                        <small style={{ color: '#6b7280' }}>
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSupportingDoc(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '18px'
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              disabled={submitting || (cvMethod === 'file' && !cvFile) || (cvMethod === 'url' && !cvUrl.trim())}
              style={{
                padding: '10px 20px',
                backgroundColor: submitting || (cvMethod === 'file' && !cvFile) || (cvMethod === 'url' && !cvUrl.trim()) ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (submitting || (cvMethod === 'file' && !cvFile) || (cvMethod === 'url' && !cvUrl.trim())) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting && <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />}
              {submitting ? 'Uploading...' : 'Upload CV & Apply for Jobs'}
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
