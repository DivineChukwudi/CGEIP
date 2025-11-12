import React, { useState } from 'react';
import { FaFileUpload, FaSpinner, FaCheckCircle, FaTrash, FaPlus, FaExclamationTriangle } from 'react-icons/fa';

// Common subjects for dropdown
const COMMON_SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History',
  'Geography', 'Computer Science', 'Business Studies', 'Economics',
  'Accounting', 'French', 'Sesotho', 'Physical Education', 'Art',
  'Music', 'Agricultural Science', 'Religious Studies'
];

// Qualification levels
const QUALIFICATION_LEVELS = [
  { value: 'High School', label: 'High School' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Degree', label: 'Degree (Bachelor)' },
  { value: 'Masters', label: 'Masters' },
  { value: 'PhD', label: 'PhD' }
];

export default function TranscriptUploadModal({ onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  
  const [subjects, setSubjects] = useState([
    { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
    { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
    { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
    { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 }
  ]);
  const [overallPercentage, setOverallPercentage] = useState('');
  
  const [graduationYear, setGraduationYear] = useState('');
  const [gpa, setGpa] = useState('');
  const [activities, setActivities] = useState('');
  const [qualificationLevel, setQualificationLevel] = useState('Degree');

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setExtractionError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setExtractionError('File size must be less than 10MB');
      return;
    }

    setPdfFile(file);
    setExtracting(true);
    setExtractionError('');
    setExtractionSuccess(false);

    try {
      console.log('🔍 Attempting to scan PDF...');
      
      // Dynamically import the extractor to avoid loading errors
      const { extractTranscriptData } = await import('../utils/pdfExtractor');
      const result = await extractTranscriptData(file);
      
      if (result.success && result.subjects && result.subjects.length > 0) {
        console.log('✅ PDF scanned successfully:', result);
        setSubjects(result.subjects.length > 0 ? result.subjects : subjects);
        setOverallPercentage(result.overallPercentage?.toString() || '');
        setExtractionSuccess(true);
        setExtractionError('');
      } else {
        throw new Error('Could not extract data from PDF');
      }
    } catch (error) {
      console.warn('⚠️ PDF scanning failed:', error.message);
      setExtractionError('Unable to scan this PDF automatically. Please enter your information manually below.');
      setExtractionSuccess(false);
    } finally {
      setExtracting(false);
      setStep(2); // Move to manual entry step regardless
    }
  };

  const handleCertificateUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + certificateFiles.length > 5) {
      alert('Maximum 5 certificate files allowed');
      return;
    }
    setCertificateFiles([...certificateFiles, ...files.slice(0, 5 - certificateFiles.length)]);
  };

  const updateSubject = (index, field, value) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'grade') {
      const percentMatch = value.match(/(\d{1,3})/);
      if (percentMatch) {
        const percent = parseInt(percentMatch[1]);
        if (percent >= 0 && percent <= 100) {
          updated[index].gradeValue = percent;
          updated[index].gradeType = 'percentage';
        }
      }
    }
    
    setSubjects(updated);
  };

  const addSubject = () => {
    if (subjects.length < 15) {
      setSubjects([...subjects, { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 }]);
    }
  };

  const removeSubject = (index) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i !== index));
    }
  };

  const calculateAverage = () => {
    const validGrades = subjects.filter(s => s.gradeValue > 0);
    if (validGrades.length === 0) return 0;
    
    const total = validGrades.reduce((sum, s) => sum + s.gradeValue, 0);
    return Math.round(total / validGrades.length);
  };

  const autoCalculatePercentage = () => {
    const avg = calculateAverage();
    setOverallPercentage(avg.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pdfFile) {
      alert('Please upload a PDF transcript');
      return;
    }

    if (!graduationYear) {
      alert('Please enter your graduation year');
      return;
    }

    const validSubjects = subjects.filter(s => s.subject && s.grade);
    if (validSubjects.length === 0) {
      alert('Please add at least one subject with a grade');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('transcript', pdfFile);
    formData.append('graduationYear', graduationYear);
    formData.append('qualificationLevel', qualificationLevel);
    
    if (gpa) formData.append('gpa', gpa);
    if (activities) formData.append('extraCurricularActivities', JSON.stringify(activities.split(',').map(a => a.trim())));
    
    formData.append('subjects', JSON.stringify(validSubjects));
    formData.append('overallPercentage', overallPercentage || calculateAverage().toString());
    
    certificateFiles.forEach(file => {
      formData.append('certificates', file);
    });

    try {
      await onSubmit(formData);
      setSubmitting(false);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Upload Academic Transcript</h2>
          <div className="step-indicator">
            <span className={step >= 1 ? 'active' : ''}>1. Upload</span>
            <span className={step >= 2 ? 'active' : ''}>2. Enter Details</span>
            <span className={step >= 3 ? 'active' : ''}>3. Submit</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Upload PDF */}
          {step === 1 && (
            <div className="upload-step">
              <div className="upload-instructions">
                <h3>Upload Your Transcript (PDF)</h3>
                <p>We'll try to scan and extract your grades automatically. If it doesn't work, you can enter them manually.</p>
              </div>

              <div className="file-upload-zone">
                <input
                  type="file"
                  id="transcript-upload"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  style={{ display: 'none' }}
                  disabled={extracting}
                />
                <label htmlFor="transcript-upload" className="upload-label">
                  {extracting ? (
                    <div className="extracting">
                      <FaSpinner className="spinner" size={48} />
                      <p>Scanning PDF...</p>
                      <small>This may take a few seconds</small>
                    </div>
                  ) : pdfFile ? (
                    <div className="file-uploaded">
                      <FaCheckCircle size={48} color="#10b981" />
                      <p>{pdfFile.name}</p>
                      <small>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</small>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <FaFileUpload size={48} />
                      <p>Click to upload your transcript (PDF)</p>
                      <small>Max size: 10MB</small>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: Review & Edit */}
          {step === 2 && (
            <div className="review-step">
              {extractionSuccess && (
                <div className="success-banner">
                  <FaCheckCircle style={{ color: '#10b981', marginRight: '10px' }} />
                  <div>
                    <strong>PDF Scanned Successfully!</strong>
                    <p>We've extracted your subjects and grades. Please review and edit if needed.</p>
                  </div>
                </div>
              )}

              {extractionError && (
                <div className="warning-banner">
                  <FaExclamationTriangle style={{ color: '#f59e0b', marginRight: '10px' }} />
                  <div>
                    <strong>Manual Entry Required</strong>
                    <p>{extractionError}</p>
                  </div>
                </div>
              )}

              <div className="section-header">
                <h3>📝 Your Subjects & Grades</h3>
                <p className="subtitle">Enter or edit your academic information</p>
              </div>

              <div className="subjects-grid">
                {subjects.map((subject, index) => (
                  <div key={index} className="subject-row">
                    <div className="subject-number">{index + 1}</div>
                    
                    <div className="subject-input-group">
                      <label>Subject Name</label>
                      <select
                        value={subject.subject}
                        onChange={(e) => updateSubject(index, 'subject', e.target.value)}
                        className="subject-select"
                      >
                        <option value="">Select Subject</option>
                        {COMMON_SUBJECTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="custom">Type Custom...</option>
                      </select>
                      
                      {subject.subject === 'custom' && (
                        <input
                          type="text"
                          placeholder="Enter custom subject name"
                          onChange={(e) => updateSubject(index, 'subject', e.target.value)}
                          style={{ marginTop: '8px' }}
                        />
                      )}
                    </div>

                    <div className="grade-input-group">
                      <label>Grade / Percentage</label>
                      <input
                        type="text"
                        value={subject.grade}
                        onChange={(e) => updateSubject(index, 'grade', e.target.value)}
                        placeholder="e.g., 85%, A, 3.5"
                        className="grade-input"
                      />
                    </div>

                    {subjects.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => removeSubject(index)}
                        title="Remove this subject"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {subjects.length < 15 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addSubject}
                  style={{ marginTop: '16px' }}
                >
                  <FaPlus /> Add Another Subject
                </button>
              )}

              <div className="overall-percentage-section">
                <label>Overall Percentage</label>
                <div className="percentage-input-group">
                  <input
                    type="number"
                    value={overallPercentage}
                    onChange={(e) => setOverallPercentage(e.target.value)}
                    placeholder="Enter overall %"
                    min="0"
                    max="100"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={autoCalculatePercentage}
                  >
                    Auto Calculate ({calculateAverage()}%)
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={() => setStep(3)}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Additional Details */}
          {step === 3 && (
            <div className="details-step">
              <h3>📅 Additional Information</h3>

              <div className="form-group">
                <label>Your Qualification Level *</label>
                <select
                  value={qualificationLevel}
                  onChange={(e) => setQualificationLevel(e.target.value)}
                  required
                  disabled={submitting}
                  className="qualification-select"
                >
                  <option value="">Select Your Qualification</option>
                  {QUALIFICATION_LEVELS.map(qual => (
                    <option key={qual.value} value={qual.value}>{qual.label}</option>
                  ))}
                </select>
                <small>This is the highest qualification you currently hold</small>
              </div>

              <div className="form-group">
                <label>Graduation Year *</label>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  min="2000"
                  max={new Date().getFullYear()}
                  required
                  placeholder="e.g., 2024"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>GPA (Optional)</label>
                <input
                  type="number"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="e.g., 3.5"
                  disabled={submitting}
                />
                <small>If applicable, enter your GPA out of 4.0</small>
              </div>

              <div className="form-group">
                <label>Additional Certificates (PDF, optional)</label>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleCertificateUpload}
                  disabled={submitting}
                />
                <small>You can select up to 5 certificate files</small>
                
                {certificateFiles.length > 0 && (
                  <div className="selected-files">
                    {certificateFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setCertificateFiles(certificateFiles.filter((_, i) => i !== index))}
                          className="btn-icon danger"
                          disabled={submitting}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Extra-Curricular Activities (comma-separated)</label>
                <textarea
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  rows="3"
                  placeholder="e.g., Student Council, Debate Team, Volunteer Work"
                  disabled={submitting}
                />
              </div>

              <div className="summary-box">
                <h4>📊 Summary</h4>
                <p><strong>Qualification:</strong> {QUALIFICATION_LEVELS.find(q => q.value === qualificationLevel)?.label}</p>
                <p><strong>Subjects:</strong> {subjects.filter(s => s.subject && s.grade).length}</p>
                <p><strong>Overall:</strong> {overallPercentage || calculateAverage()}%</p>
                <p><strong>Certificates:</strong> {certificateFiles.length}</p>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setStep(2)}
                  disabled={submitting}
                >
                  ← Back
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="spinner" /> Submitting...
                    </>
                  ) : (
                    <>
                      <FaFileUpload /> Submit Transcript
                    </>
                  )}
                </button>
              </div>

              {submitting && (
                <div className="upload-progress">
                  <div className="progress-bar-container">
                    <div className="progress-bar-animated"></div>
                  </div>
                  <p className="progress-text">
                    📤 Uploading transcript and certificates...<br/>
                    <small>Please wait, this may take a moment</small>
                  </p>
                </div>
              )}
            </div>
          )}
        </form>

        <style jsx>{`
          .success-banner, .warning-banner {
            display: flex;
            align-items: center;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
          }
          
          .success-banner {
            background: #d1fae5;
            border: 1px solid #10b981;
          }
          
          .warning-banner {
            background: #fff3cd;
            border: 1px solid #f59e0b;
          }
          
          .success-banner strong, .warning-banner strong {
            display: block;
            margin-bottom: 4px;
          }
          
          .success-banner p, .warning-banner p {
            margin: 0;
            font-size: 14px;
          }

          /* Keep all other existing styles */
        `}</style>
      </div>
    </div>
  );
}