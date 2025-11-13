const { db, collections } = require('../config/firebase');

/**
 * Job Matching Service
 * Automatically matches newly posted jobs with student preferences
 * Uses fuzzy matching to find related skills, industries, and work types
 */

// Skill category mappings - group related skills together
const SKILL_CATEGORIES = {
  'programming_languages': [
    'python', 'java', 'c++', 'c#', 'javascript', 'typescript', 'ruby', 'php',
    'go', 'rust', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab', 'vb', 'c'
  ],
  'web_development': [
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'html', 'css', 'javascript', 'typescript', 'webpack', 'gulp', 'frontend',
    'backend', 'full-stack', 'mern', 'mean'
  ],
  'data': [
    'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'firebase', 'elasticsearch',
    'data analysis', 'data science', 'python', 'r', 'tableau', 'power bi',
    'big data', 'hadoop', 'spark', 'database'
  ],
  'devops': [
    'docker', 'kubernetes', 'ci/cd', 'jenkins', 'gitlab', 'github actions',
    'terraform', 'ansible', 'aws', 'azure', 'gcp', 'devops', 'linux', 'bash'
  ],
  'cloud': [
    'aws', 'azure', 'gcp', 'google cloud', 'cloud computing', 'serverless',
    'lambda', 'cloud storage', 'docker', 'kubernetes'
  ],
  'ai_ml': [
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
    'nlp', 'computer vision', 'ai', 'artificial intelligence', 'python', 'r',
    'keras', 'neural networks'
  ],
  'project_management': [
    'project management', 'agile', 'scrum', 'kanban', 'jira', 'asana',
    'leadership', 'team management', 'pmp'
  ],
  'marketing': [
    'marketing', 'digital marketing', 'seo', 'sem', 'content marketing',
    'social media', 'analytics', 'marketing automation', 'crm'
  ],
  'sales': [
    'sales', 'business development', 'account management', 'customer relations',
    'negotiation', 'crm', 'sales force'
  ],
  'design': [
    'ui design', 'ux design', 'graphic design', 'figma', 'sketch', 'adobe xd',
    'prototyping', 'wireframing', 'design thinking'
  ]
};

// Industry category mappings - group related industries
const INDUSTRY_CATEGORIES = {
  'technology': [
    'technology', 'tech', 'software', 'it', 'information technology',
    'saas', 'cloud', 'cybersecurity'
  ],
  'finance': [
    'finance', 'fintech', 'banking', 'investment', 'accounting',
    'financial services', 'insurance'
  ],
  'healthcare': [
    'healthcare', 'health', 'medical', 'pharma', 'pharmaceutical',
    'biotech', 'wellness'
  ],
  'education': [
    'education', 'edtech', 'e-learning', 'training', 'academia',
    'university', 'school'
  ],
  'marketing': [
    'marketing', 'advertising', 'advertising', 'pr', 'communications',
    'brand', 'digital'
  ],
  'engineering': [
    'engineering', 'manufacturing', 'construction', 'infrastructure',
    'mechanical', 'civil', 'electrical'
  ],
  'retail': [
    'retail', 'ecommerce', 'e-commerce', 'shopping', 'commerce'
  ],
  'entertainment': [
    'entertainment', 'media', 'gaming', 'film', 'music', 'streaming',
    'content'
  ]
};

// Work type preferences - alternatives
const WORK_TYPE_ALTERNATIVES = {
  'remote': ['remote', 'work from home', 'distributed'],
  'on-site': ['on-site', 'office', 'in-person'],
  'hybrid': ['hybrid', 'flexible', 'remote-first']
};

class JobMatcher {
  constructor(interval = 10 * 60 * 1000) { // 10 minutes default
    this.interval = interval;
    this.lastCheck = new Date();
    this.isRunning = false;
  }

  /**
   * Start the job matcher service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Job matcher is already running');
      return;
    }

    this.isRunning = true;
    console.log(`✅ Job Matcher started - checking every ${this.interval / 1000 / 60} minutes`);

    this.scheduleCheck();
  }

  /**
   * Stop the job matcher service
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.isRunning = false;
      console.log('🛑 Job Matcher stopped');
    }
  }

  /**
   * Schedule periodic checks
   */
  scheduleCheck() {
    this.timer = setInterval(async () => {
      try {
        await this.matchJobsWithPreferences();
      } catch (error) {
        console.error('❌ Error in job matcher:', error);
      }
    }, this.interval);
  }

  /**
   * Main matching function - runs periodically
   */
  async matchJobsWithPreferences() {
    try {
      const now = new Date();
      console.log(`\n🔄 Job Matcher Running - ${now.toISOString()}`);

      // Get all active jobs posted since last check
      const jobsSnapshot = await db.collection(collections.JOBS)
        .where('status', '==', 'active')
        .where('postedAt', '>=', this.lastCheck.toISOString())
        .get();

      if (jobsSnapshot.empty) {
        console.log('✅ No new jobs to match');
        this.lastCheck = now;
        return;
      }

      console.log(`📋 Found ${jobsSnapshot.docs.length} new jobs to match`);

      let totalNotifications = 0;

      // For each new job, find matching students
      for (const jobDoc of jobsSnapshot.docs) {
        const job = jobDoc.data();
        const matchedCount = await this.findAndNotifyMatchingStudents(job, jobDoc.id);
        totalNotifications += matchedCount;
      }

      this.lastCheck = now;
      console.log(`✅ Job Matcher completed - sent ${totalNotifications} notifications`);
    } catch (error) {
      console.error('❌ Error in matchJobsWithPreferences:', error);
    }
  }

  /**
   * Find students with matching preferences and notify them
   */
  async findAndNotifyMatchingStudents(job, jobId) {
    try {
      // Get all students with job preferences
      const preferencesSnapshot = await db.collection(collections.JOB_PREFERENCES).get();

      if (preferencesSnapshot.empty) {
        console.log('   No students with preferences set');
        return 0;
      }

      let notificationCount = 0;
      const notificationPromises = [];

      for (const prefDoc of preferencesSnapshot.docs) {
        const studentId = prefDoc.id;
        const preferences = prefDoc.data();

        // Check if this job matches the student's preferences (with fuzzy matching)
        const matchResult = this.checkJobPreferenceMatch(job, preferences);
        
        if (matchResult.isMatch) {
          console.log(`   ✓ Matched job with student ${studentId} (score: ${matchResult.score}%)`);

          // Create notification
          notificationPromises.push(
            this.createJobMatchNotification(studentId, job, jobId, matchResult)
          );
          notificationCount++;
        }
      }

      // Send all notifications
      if (notificationPromises.length > 0) {
        await Promise.all(notificationPromises);
        console.log(`   📢 Sent ${notificationCount} notifications for job: ${job.title}`);
      }

      return notificationCount;
    } catch (error) {
      console.error(`❌ Error finding matching students for job:`, error);
      return 0;
    }
  }

  /**
   * Fuzzy match two skills - check if they're in the same category
   */
  isSkillRelated(studentSkill, jobSkill) {
    const normalized1 = studentSkill.toLowerCase().trim();
    const normalized2 = jobSkill.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) return true;

    // Check if both skills are in the same category
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      const hasSkill1 = skills.some(s => s.includes(normalized1) || normalized1.includes(s));
      const hasSkill2 = skills.some(s => s.includes(normalized2) || normalized2.includes(s));
      
      if (hasSkill1 && hasSkill2) return true;
    }

    return false;
  }

  /**
   * Fuzzy match two industries
   */
  isIndustryRelated(studentIndustry, jobIndustry) {
    const normalized1 = studentIndustry.toLowerCase().trim();
    const normalized2 = jobIndustry.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) return true;

    // Check if both industries are in the same category
    for (const [category, industries] of Object.entries(INDUSTRY_CATEGORIES)) {
      const hasInd1 = industries.some(i => i.includes(normalized1) || normalized1.includes(i));
      const hasInd2 = industries.some(i => i.includes(normalized2) || normalized2.includes(i));
      
      if (hasInd1 && hasInd2) return true;
    }

    return false;
  }

  /**
   * Fuzzy match work types
   */
  isWorkTypeRelated(studentWorkType, jobWorkType) {
    const normalized1 = studentWorkType.toLowerCase().trim();
    const normalized2 = jobWorkType.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) return true;

    // Check alternatives
    for (const [mainType, alternatives] of Object.entries(WORK_TYPE_ALTERNATIVES)) {
      const hasType1 = alternatives.some(a => a.includes(normalized1) || normalized1.includes(a));
      const hasType2 = alternatives.some(a => a.includes(normalized2) || normalized2.includes(a));
      
      if (hasType1 && hasType2) return true;
    }

    return false;
  }

  /**
   * Check if a job matches a student's preferences with fuzzy matching
   */
  checkJobPreferenceMatch(job, preferences) {
    try {
      let matchScore = 0;
      let matchReasons = [];

      // Industry match (25% weight) - with fuzzy matching
      if (preferences.industries && preferences.industries.length > 0) {
        if (job.industries && job.industries.length > 0) {
          const hasIndustryMatch = job.industries.some(jobInd =>
            preferences.industries.some(prefInd =>
              this.isIndustryRelated(prefInd, jobInd)
            )
          );
          if (hasIndustryMatch) {
            matchScore += 25;
            matchReasons.push('industry');
          }
        }
      }

      // Skills match (25% weight) - with fuzzy matching for related skills
      if (preferences.skills && preferences.skills.length > 0) {
        if (job.skills && job.skills.length > 0) {
          const hasSkillMatch = job.skills.some(jobSkill =>
            preferences.skills.some(prefSkill =>
              this.isSkillRelated(prefSkill, jobSkill)
            )
          );
          if (hasSkillMatch) {
            matchScore += 25;
            matchReasons.push('skills');
          }
        }
      }

      // Work type match (25% weight) - with fuzzy matching
      if (preferences.workType && preferences.workType.length > 0) {
        if (job.workType && job.workType.length > 0) {
          const hasWorkTypeMatch = job.workType.some(jobWT =>
            preferences.workType.some(prefWT =>
              this.isWorkTypeRelated(prefWT, jobWT)
            )
          );
          if (hasWorkTypeMatch) {
            matchScore += 25;
            matchReasons.push('work type');
          }
        }
      }

      // Location match (25% weight)
      if (preferences.location) {
        if (job.location) {
          const locationMatch = 
            job.location.toLowerCase().includes(preferences.location.toLowerCase()) ||
            preferences.location.toLowerCase() === 'remote' ||
            (preferences.location.toLowerCase() === 'flexible' && 
             ['remote', 'hybrid', 'on-site'].some(t => job.location.toLowerCase().includes(t)));
          
          if (locationMatch) {
            matchScore += 25;
            matchReasons.push('location');
          }
        }
      }

      // Return true if match score is 50 or more (at least 2 out of 4 criteria matched)
      return {
        isMatch: matchScore >= 50,
        score: matchScore,
        reasons: matchReasons
      };
    } catch (error) {
      console.error('Error checking preference match:', error);
      return { isMatch: false, score: 0, reasons: [] };
    }
  }

  /**
   * Create a notification for matched job
   */
  async createJobMatchNotification(studentId, job, jobId, matchResult) {
    try {
      const reasonText = matchResult.reasons.length > 0 
        ? ` based on your ${matchResult.reasons.join(', ')} preferences`
        : '';

      const notificationData = {
        userId: studentId,
        type: 'job_match',
        title: '🎯 New Job Matches Your Interests!',
        message: `${job.title} at ${job.company} matches your job interests${reasonText}. Click to view!`,
        relatedId: jobId,
        read: false,
        createdAt: new Date().toISOString()
      };

      await db.collection(collections.NOTIFICATIONS).add(notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Set the check interval (in milliseconds)
   */
  setInterval(milliseconds) {
    this.interval = milliseconds;
    if (this.isRunning) {
      this.stop();
      this.start();
      console.log(`⚙️ Job Matcher interval updated to ${milliseconds / 1000 / 60} minutes`);
    }
  }

  /**
   * Get status of the job matcher
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: `${this.interval / 1000 / 60} minutes`,
      lastCheck: this.lastCheck,
      nextCheck: new Date(this.lastCheck.getTime() + this.interval)
    };
  }
}

module.exports = JobMatcher;
