const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration - must be before other middleware
app.use(cors())

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📡 ${timestamp} - ${req.method} ${req.originalUrl}`);

  // Log request body for POST/PUT requests (but not for sensitive data)
  if (['POST', 'PUT'].includes(req.method) && !req.originalUrl.includes('auth')) {
    console.log('   Body:', JSON.stringify(req.body, null, 2));
  }

  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
console.log('🔄 Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sudhirchoudhary410:sudhirchoudhary410@startup.a101qex.mongodb.net/hardware-inventory')
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Database: hardware-inventory');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('💡 To fix this, either:');
  console.log('   1. Start MongoDB locally: brew services start mongodb-community');
  console.log('   2. Install MongoDB: https://docs.mongodb.com/manual/installation/');
  console.log('   3. Use MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
});

// Rate limiting - apply to API routes only (skip OPTIONS requests)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.method === 'OPTIONS' // Skip rate limiting for OPTIONS requests
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hardware Inventory API is running' });
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    const timestamp = new Date().toISOString();
    console.log(`📤 ${timestamp} - ${req.method} ${req.originalUrl} - ${res.statusCode}`);
    return originalSend.call(this, data);
  };
  next();
});

// 404 handler for unmatched routes
app.use((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`❌ ${timestamp} - ${req.method} ${req.originalUrl} - 404 Not Found`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`💥 ${timestamp} - ${req.method} ${req.originalUrl} - Error:`, err.message);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

app.listen(PORT, () => {
  console.log('🚀 ======================================');
  console.log('🚀 SANJAY HARDWARE INVENTORY API SERVER');
  console.log('🚀 ======================================');
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
  console.log('🚀 ======================================');
});

module.exports = app;
