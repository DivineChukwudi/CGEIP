// client/src/components/TranscriptUploadModal.jsx
import React, { useState } from 'react';
import { FaFileUpload, FaSpinner, FaCheckCircle, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { extractTranscriptData, getAllSubjects } from '../utils/pdfExtractor';

export default function TranscriptUploadModal({ onClose, onSubmit }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Review & Edit, 3: Final Details
  const [pdfFile, setPdfFile] = useState(null);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  
  // Extracted data
  const [subjects, setSubjects] = useState([]);
  const [overallPercentage, setOverallPercentage] = useState('');
  
  // Additional form fields
  const [graduationYear, setGraduationYear] = useState('');
  const [gpa, setGpa] = useState('');
  const [activities, setActivities] = useState('');
  
  const allSubjects = getAllSubjects();

  // Handle PDF file upload
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

    try {
      console.log('Starting PDF extraction...');
      const result = await extractTranscriptData(file);
      
      if (result.success) {
        console.log('Extraction successful:', result);
        setSubjects(result.subjects.length > 0 ? result.subjects : [
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 }
        ]);
        setOverallPercentage(result.overallPercentage?.toString() || '');
        setStep(2);
      } else {
        setExtractionError('Could not extract data automatically. Please enter manually.');
        setSubjects([
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
          { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 }
        ]);
        setStep(2);
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      setExtractionError('Failed to extract data. Please enter manually.');
      setSubjects([
        { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
        { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
        { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 },
        { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 }
      ]);
      setStep(2);
    } finally {
      setExtracting(false);
    }
  };

  // Handle certificate files upload
  const handleCertificateUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + certificateFiles.length > 5) {
      alert('Maximum 5 certificate files allowed');
      return;
    }
    setCertificateFiles([...certificateFiles, ...files.slice(0, 5 - certificateFiles.length)]);
  };

  // Update subject
  const updateSubject = (index, field, value) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating grade, try to parse it
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

  // Add new subject row
  const addSubject = () => {
    if (subjects.length < 15) {
      setSubjects([...subjects, { subject: '', grade: '', gradeType: 'percentage', gradeValue: 0 }]);
    }
  };

  // Remove subject row
  const removeSubject = (index) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i !== index));
    }
  };

  // Calculate average percentage
  const calculateAverage = () => {
    const validGrades = subjects.filter(s => s.gradeValue > 0);
    if (validGrades.length === 0) return 0;
    
    const total = validGrades.reduce((sum, s) => sum + s.gradeValue, 0);
    return Math.round(total / validGrades.length);
  };

  // Auto-calculate overall percentage
  const autoCalculatePercentage = () => {
    const avg = calculateAverage();
    setOverallPercentage(avg.toString());
  };

  // Handle form submission
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

    // Validate subjects
    const validSubjects = subjects.filter(s => s.subject && s.grade);
    if (validSubjects.length === 0) {
      alert('Please add at least one subject with a grade');
      return;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('transcript', pdfFile);
    formData.append('graduationYear', graduationYear);
    
    if (gpa) formData.append('gpa', gpa);
    if (activities) formData.append('extraCurricularActivities', JSON.stringify(activities.split(',').map(a => a.trim())));
    
    // Add subjects data
    formData.append('subjects', JSON.stringify(validSubjects));
    formData.append('overallPercentage', overallPercentage || calculateAverage().toString());
    
    // Add certificates
    certificateFiles.forEach(file => {
      formData.append('certificates', file);
    });

    await onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Upload Academic Transcript</h2>
          <div className="step-indicator">
            <span className={step >= 1 ? 'active' : ''}>1. Upload</span>
            <span className={step >= 2 ? 'active' : ''}>2. Review</span>
            <span className={step >= 3 ? 'active' : ''}>3. Details</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Upload PDF */}
          {step === 1 && (
            <div className="upload-step">
              <div className="upload-instructions">
                <h3>📋 What We'll Extract:</h3>
                <ul>
                  <li>✅ Subject names</li>
                  <li>✅ Grades/Percentages</li>
                  <li>✅ Overall performance</li>
                </ul>
                <p className="note">You'll be able to review and edit everything before submitting!</p>
              </div>

              <div className="file-upload-zone">
                <input
                  type="file"
                  id="transcript-upload"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="transcript-upload" className="upload-label">
                  {extracting ? (
                    <div className="extracting">
                      <FaSpinner className="spinner" size={48} />
                      <p>Extracting data from PDF...</p>
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

              {extractionError && (
                <div className="extraction-warning">
                  ⚠️ {extractionError}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Review & Edit Extracted Data */}
          {step === 2 && (
            <div className="review-step">
              <div className="section-header">
                <h3>📝 Review Extracted Subjects & Grades</h3>
                <p className="subtitle">Edit any incorrect data or add missing subjects</p>
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
                        {allSubjects.map(s => (
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
                <label>Graduation Year *</label>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  min="2000"
                  max={new Date().getFullYear()}
                  required
                  placeholder="e.g., 2024"
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
                />
              </div>

              <div className="summary-box">
                <h4>📊 Summary</h4>
                <p><strong>Subjects:</strong> {subjects.filter(s => s.subject && s.grade).length}</p>
                <p><strong>Overall:</strong> {overallPercentage || calculateAverage()}%</p>
                <p><strong>Certificates:</strong> {certificateFiles.length}</p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button type="submit" className="btn-primary">
                  <FaFileUpload /> Submit Transcript
                </button>
              </div>
            </div>
          )}

          {step < 3 && step > 1 && (
            <button type="button" className="btn-secondary" onClick={onClose} style={{ marginTop: '16px' }}>
              Cancel
            </button>
          )}
        </form>

        <style jsx>{`
          .modal-header {
            margin-bottom: 24px;
          }

          .step-indicator {
            display: flex;
            gap: 20px;
            margin-top: 16px;
            font-size: 14px;
          }

          .step-indicator span {
            color: #9ca3af;
          }

          .step-indicator span.active {
            color: #667eea;
            font-weight: 600;
          }

          .upload-step {
            text-align: center;
          }

          .upload-instructions {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 24px;
          }

          .upload-instructions h3 {
            margin-top: 0;
            color: #1e40af;
          }

          .upload-instructions ul {
            text-align: left;
            display: inline-block;
            margin: 16px 0;
          }

          .note {
            color: #6b7280;
            font-size: 14px;
            margin-top: 16px;
          }

          .file-upload-zone {
            margin: 24px 0;
          }

          .upload-label {
            display: block;
            border: 3px dashed #d1d5db;
            border-radius: 12px;
            padding: 60px 40px;
            cursor: pointer;
            transition: all 0.3s;
          }

          .upload-label:hover {
            border-color: #667eea;
            background: #f9fafb;
          }

          .extracting, .file-uploaded, .upload-prompt {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .extraction-warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 6px;
            margin-top: 16px;
          }

          .subjects-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin: 24px 0;
          }

          .subject-row {
            display: grid;
            grid-template-columns: 40px 1fr 1fr 40px;
            gap: 12px;
            align-items: end;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .subject-number {
            width: 32px;
            height: 32px;
            background: #667eea;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
          }

          .subject-input-group, .grade-input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .subject-input-group label, .grade-input-group label {
            font-size: 12px;
            font-weight: 600;
            color: #4b5563;
          }

          .subject-select, .grade-input {
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
          }

          .overall-percentage-section {
            margin: 32px 0;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 8px;
          }

          .overall-percentage-section label {
            display: block;
            font-weight: 600;
            margin-bottom: 12px;
            color: #1e40af;
          }

          .percentage-input-group {
            display: flex;
            gap: 12px;
          }

          .percentage-input-group input {
            flex: 1;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
          }

          .selected-files {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #f9fafb;
            border-radius: 6px;
            font-size: 14px;
          }

          .summary-box {
            background: #f0fdf4;
            border: 1px solid #10b981;
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
          }

          .summary-box h4 {
            margin-top: 0;
            color: #065f46;
          }

          .summary-box p {
            margin: 8px 0;
            color: #047857;
          }
        `}</style>
      </div>
    </div>
  );
}