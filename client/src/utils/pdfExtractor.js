// client/src/utils/pdfExtractor.js
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Common subject patterns to look for
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
  /([A-F][+-]?)/gi, // Letter grades: A, B+, C-, etc.
  /(\d{1,3})%/g, // Percentages: 85%, 90%
  /(\d{1,3})\s*\/\s*100/g, // Fractions: 85/100
  /(\d\.\d{1,2})\s*\/\s*4\.0/g, // GPA: 3.5/4.0
];

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Parse grades from text
 */
function parseGrade(gradeText) {
  gradeText = gradeText.trim();
  
  // Try to parse as percentage
  const percentMatch = gradeText.match(/(\d{1,3})%?/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    if (percent >= 0 && percent <= 100) {
      return { type: 'percentage', value: percent, display: `${percent}%` };
    }
  }
  
  // Try to parse as letter grade
  const letterMatch = gradeText.match(/([A-F][+-]?)/i);
  if (letterMatch) {
    return { type: 'letter', value: letterMatch[1].toUpperCase(), display: letterMatch[1].toUpperCase() };
  }
  
  // Try to parse as GPA
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
  
  // Simple heuristic: look for lines that contain both a subject name and a grade
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip header lines
    if (line.toLowerCase().includes('transcript') || 
        line.toLowerCase().includes('student name') ||
        line.toLowerCase().includes('student id')) {
      continue;
    }
    
    // Check if line contains a known subject
    let foundSubject = null;
    for (const subject of COMMON_SUBJECTS) {
      if (line.toLowerCase().includes(subject.toLowerCase())) {
        foundSubject = subject;
        break;
      }
    }
    
    if (foundSubject) {
      // Try to find a grade in the same line or next few lines
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
  
  // If we didn't find structured data, try a more aggressive approach
  if (subjects.length === 0) {
    // Look for any line with a number that could be a grade
    for (const line of lines) {
      const words = line.split(/\s+/);
      
      // Skip short lines
      if (words.length < 2) continue;
      
      // Look for potential subject (2+ consecutive capitalized words)
      let subjectWords = [];
      let foundGrade = null;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Check if this looks like a grade
        const grade = parseGrade(word);
        if (grade) {
          foundGrade = grade;
          break;
        }
        
        // Check if this looks like part of a subject name
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
      // Convert GPA to percentage (approximate)
      percentage = (subject.gradeValue / 4.0) * 100;
    } else if (subject.gradeType === 'letter') {
      // Convert letter grade to percentage (approximate)
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
 * Main extraction function
 */
export async function extractTranscriptData(pdfFile) {
  try {
    console.log('Extracting text from PDF...');
    const text = await extractTextFromPDF(pdfFile);
    
    console.log('Parsing subjects and grades...');
    const subjects = extractSubjectsAndGrades(text);
    
    console.log('Calculating overall percentage...');
    const overallPercentage = calculateOverallPercentage(subjects);
    
    return {
      success: true,
      subjects: subjects.slice(0, 10), // Limit to 10 subjects
      overallPercentage,
      rawText: text.substring(0, 1000) // Keep first 1000 chars for debugging
    };
  } catch (error) {
    console.error('Transcript extraction error:', error);
    return {
      success: false,
      error: error.message,
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