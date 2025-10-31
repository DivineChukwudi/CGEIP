// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const institutionRoutes = require('./routes/institution');
const studentRoutes = require('./routes/student');
const companyRoutes = require('./routes/company');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/company', companyRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Career Guidance Platform API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});