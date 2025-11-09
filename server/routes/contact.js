// server/routes/contact.js
const express = require('express');
const router = express.Router();
const { sendContactFormEmail } = require('../utils/email');

// Contact form endpoint
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'All fields are required',
        details: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          subject: !subject ? 'Subject is required' : null,
          message: !message ? 'Message is required' : null
        }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }

    // Send email using SendGrid
    await sendContactFormEmail(name, email, subject, message);

    // Log the submission
    console.log('✅ Contact form submission received and processed');
    console.log(`   From: ${name} (${email})`);
    console.log(`   Subject: ${subject}`);

    res.status(200).json({ 
      success: true, 
      message: 'Your message has been sent successfully! We\'ll get back to you soon.' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Send user-friendly error message
    res.status(500).json({ 
      error: 'Failed to send message. Please try again later or contact us directly via email.',
      technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;