import * as pdfjsLib from 'pdfjs-dist';

// ✅ FIXED: Use matching worker version
const WORKER_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${WORKER_VERSION}/pdf.worker.min.js`;

// Common subject patterns
const COMMON_SUBJECTS = [
  'Mathematics', 'Math', 'Algebra', 'Calculus', 'Statistics',
  'English', 'English Language', 'Literature',
  'Physics', 'Chemistry', 'Biology', 'Science', 'Physical Science',
  'History', 'Geography', 'Social Studies', 'Development Studies',
  'Computer Science', 'ICT', 'Information Technology',
  'Business Studies', 'Economics', 'Accounting', 'Commerce',
  'French', 'Spanish', 'German', 'Afrikaans', 'Sesotho', 'Zulu',
  'Physical Education', 'PE', 'Sports',
  'Art', 'Music', 'Drama',
  'Religious Studies', 'Religious Education', 'Ethics',
  'Agricultural Science', 'Home Economics', 'Technical Drawing'
];

// Grade/percentage patterns
const GRADE_PATTERNS = [
  /([A-F][+-]?)/gi,
  /(\d{1,3})%/g,
  /(\d{1,3})\s*\/\s*100/g,
  /(\d\.\d{1,2})\s*\/\s*4\.0/g,
];

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      // Add error handling options
      stopAtErrors: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      } catch (pageError) {
        console.warn(`⚠️ Could not read page ${i}:`, pageError.message);
        continue; // Skip this page but continue with others
      }
    }
    
    return fullText;
  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    // Return a more user-friendly error
    throw new Error('Unable to read this PDF format. Please enter your information manually.');
  }
}

/**
 * Parse grades from text
 */
function parseGrade(gradeText) {
  gradeText = gradeText.trim();
  
  // Try percentage first
  const percentMatch = gradeText.match(/(\d{1,3})%?/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    if (percent >= 0 && percent <= 100) {
      return { type: 'percentage', value: percent, display: `${percent}%` };
    }
  }
  
  // Try letter grade
  const letterMatch = gradeText.match(/([A-F][+-]?)/i);
  if (letterMatch) {
    return { type: 'letter', value: letterMatch[1].toUpperCase(), display: letterMatch[1].toUpperCase() };
  }
  
  // Try GPA
  const gpaMatch = gradeText.match(/(\d\.\d{1,2})/);
  if (gpaMatch) {
    const gpa = parseFloat(gpaMatch[1]);
    if (gpa >= 0 && gpa <= 4.0) {
      return { type: 'gpa', value: gpa, display: `${gpa}/4.0` };
    }
  }
  
  return null;
}

/**
 * Extract subject-grade pairs from text
 */
export function extractSubjectsAndGrades(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const subjects = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip header lines
    if (line.toLowerCase().includes('transcript') || 
        line.toLowerCase().includes('student name') ||
        line.toLowerCase().includes('student id')) {
      continue;
    }
    
    // Look for common subjects
    let foundSubject = null;
    for (const subject of COMMON_SUBJECTS) {
      if (line.toLowerCase().includes(subject.toLowerCase())) {
        foundSubject = subject;
        break;
      }
    }
    
    if (foundSubject) {
      const searchText = line + ' ' + (lines[i + 1] || '') + ' ' + (lines[i + 2] || '');
      
      for (const pattern of GRADE_PATTERNS) {
        const matches = searchText.matchAll(pattern);
        for (const match of matches) {
          const grade = parseGrade(match[0]);
          if (grade) {
            subjects.push({
              subject: foundSubject,
              grade: grade.display,
              gradeType: grade.type,
              gradeValue: grade.value,
              rawLine: line
            });
            break;
          }
        }
        if (subjects.length > 0 && subjects[subjects.length - 1].rawLine === line) {
          break;
        }
      }
    }
  }
  
  // Fallback: try to find any patterns
  if (subjects.length === 0) {
    for (const line of lines) {
      const words = line.split(/\s+/);
      
      if (words.length < 2) continue;
      
      let subjectWords = [];
      let foundGrade = null;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        const grade = parseGrade(word);
        if (grade) {
          foundGrade = grade;
          break;
        }
        
        if (/^[A-Z]/.test(word) && word.length > 2) {
          subjectWords.push(word);
        }
      }
      
      if (subjectWords.length > 0 && foundGrade) {
        subjects.push({
          subject: subjectWords.join(' '),
          grade: foundGrade.display,
          gradeType: foundGrade.type,
          gradeValue: foundGrade.value,
          rawLine: line
        });
      }
    }
  }
  
  return subjects;
}

/**
 * Calculate overall percentage from extracted grades
 */
export function calculateOverallPercentage(subjects) {
  if (!subjects || subjects.length === 0) return null;
  
  let totalPercentage = 0;
  let count = 0;
  
  for (const subject of subjects) {
    let percentage = null;
    
    if (subject.gradeType === 'percentage') {
      percentage = subject.gradeValue;
    } else if (subject.gradeType === 'gpa') {
      percentage = (subject.gradeValue / 4.0) * 100;
    } else if (subject.gradeType === 'letter') {
      const letterToPercent = {
        'A+': 97, 'A': 93, 'A-': 90,
        'B+': 87, 'B': 83, 'B-': 80,
        'C+': 77, 'C': 73, 'C-': 70,
        'D+': 67, 'D': 63, 'D-': 60,
        'F': 50
      };
      percentage = letterToPercent[subject.gradeValue] || null;
    }
    
    if (percentage !== null) {
      totalPercentage += percentage;
      count++;
    }
  }
  
  return count > 0 ? Math.round(totalPercentage / count) : null;
}

/**
 * Main extraction function with comprehensive error handling
 */
export async function extractTranscriptData(pdfFile) {
  try {
    console.log('🔍 Starting PDF extraction...');
    
    // Try to extract text
    let text = '';
    try {
      text = await extractTextFromPDF(pdfFile);
      console.log('✅ Text extracted:', text.length, 'characters');
    } catch (extractError) {
      console.error('❌ Text extraction failed:', extractError.message);
      return {
        success: false,
        error: 'Could not read PDF. Please enter your information manually.',
        subjects: [],
        overallPercentage: null
      };
    }
    
    // If we got very little text, the PDF might be image-based
    if (text.trim().length < 50) {
      console.warn('⚠️ Very little text found - might be scanned image');
      return {
        success: false,
        error: 'This appears to be a scanned document. Please enter your information manually.',
        subjects: [],
        overallPercentage: null
      };
    }
    
    // Try to parse subjects and grades
    console.log('🔍 Parsing subjects and grades...');
    const subjects = extractSubjectsAndGrades(text);
    
    console.log('✅ Found', subjects.length, 'subjects');
    
    // Calculate overall percentage
    const overallPercentage = calculateOverallPercentage(subjects);
    
    // Return success even if no subjects found (user will enter manually)
    return {
      success: subjects.length > 0,
      subjects: subjects.slice(0, 10),
      overallPercentage,
      rawText: text.substring(0, 500),
      message: subjects.length > 0 
        ? 'Data extracted successfully'
        : 'Could not find subjects automatically. Please enter manually.'
    };
  } catch (error) {
    console.error('❌ Transcript extraction error:', error);
    return {
      success: false,
      error: 'Unable to scan this PDF. Please enter your information manually.',
      subjects: [],
      overallPercentage: null
    };
  }
}

/**
 * Get all available subjects for dropdown
 */
export function getAllSubjects() {
  return COMMON_SUBJECTS.sort();
}

export { COMMON_SUBJECTS };