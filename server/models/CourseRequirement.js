const mongoose = require('mongoose');

const courseRequirementSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  
  // Required subjects with minimum marks
  requiredSubjects: [
    {
      subjectName: {
        type: String,
        required: true
      },
      minimumMark: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      }
    }
  ],
  
  // Optional additional subjects (student can have them but not required)
  additionalSubjects: [
    {
      subjectName: {
        type: String,
        required: true
      },
      preferredMinimumMark: {
        type: Number,
        min: 0,
        max: 100
      }
    }
  ],
  
  // Overall qualification requirements
  minimumOverallPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Minimum number of required subjects student must have
  minimumRequiredSubjectsNeeded: {
    type: Number,
    required: true,
    default: function() {
      return this.requiredSubjects.length;
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CourseRequirement', courseRequirementSchema);
