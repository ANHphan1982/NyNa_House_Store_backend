// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 🔥 IMPORT EMAIL SERVICE
const { verifyEmailConfig } = require('./src/services/emailService');

const app = express();
const port = process.env.PORT || 5000;

// 🔥 CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ny-na-house-store-frontend.vercel.app',
  /\.vercel\.app$/ // Regex để cho phép tất cả preview deployments
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// 🔥 PREFLIGHT OPTIONS HANDLER
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 REQUEST LOGGER
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Import Routes
const productRoutes = require('./src/products/product.route');
const orderRoutes = require('./src/orders/order.route');
const userRoutes = require('./src/users/user.route');
const adminRoutes = require('./src/admin/admin.route');

// Mount Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Vietnamese E-commerce API is running!',
    version: '2.0.0',
    cors: 'enabled',
    features: {
      '2FA': 'Email OTP verification',
      'Admin': 'Two-factor authentication',
      'Products': 'CRUD operations',
      'Orders': 'Order management',
      'Users': 'Authentication & authorization'
    },
    allowedOrigins: allowedOrigins.map(o => o.toString()),
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      auth: '/api/auth',
      admin: '/api/admin'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage()
  });
});

// 404 handler
app.use((req, res, next) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 🔥 STORE SERVER INSTANCE
let server;

// 🔥 START SERVER WITH EMAIL SERVICE VERIFICATION
const startServer = async () => {
  try {
    // Step 1: Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log('📦 Database:', mongoose.connection.name);
    
    // Step 2: Verify Email Service
    console.log('🔄 Verifying email service...');
    const emailReady = await verifyEmailConfig();
    
    if (emailReady) {
      console.log('✅ Email service configured and ready');
      console.log('📧 Email user:', process.env.EMAIL_USER);
    } else {
      console.warn('⚠️ Email service not configured properly');
      console.warn('💡 2FA features will not work without email configuration');
      console.warn('📝 Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    }
    
    // Step 3: Start HTTP Server
    server = app.listen(port, () => {
      console.log('='.repeat(70));
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`🔗 API: https://nyna-house-store-backend-3.onrender.com`);
      console.log(`🌐 CORS enabled for:`);
      allowedOrigins.forEach(origin => {
        console.log(`   - ${origin.toString()}`);
      });
      console.log(`🔐 Features:`);
      console.log(`   - Two-Factor Authentication (2FA) via Email`);
      console.log(`   - Admin OTP verification`);
      console.log(`   - Secure JWT tokens`);
      console.log('='.repeat(70));
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// 🔥 START THE SERVER
startServer();

// 🔥 HANDLE UNHANDLED PROMISE REJECTIONS
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  console.error('Stack:', err.stack);
  
  if (server) {
    console.log('🔄 Closing server...');
    server.close(() => {
      console.log('💤 Server closed');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        process.exit(1);
      });
    });
  } else {
    process.exit(1);
  }
});

// 🔥 HANDLE SIGTERM (Production shutdown)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('💤 HTTP server closed');
      
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
});

// 🔥 HANDLE SIGINT (Ctrl+C in development)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('💤 HTTP server closed');
      
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
});

// 🔥 HANDLE UNCAUGHT EXCEPTIONS
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  console.error('⚠️ Application will restart...');
  
  // Log error to file or monitoring service here
  
  process.exit(1);
});

// Export app for testing
module.exports = app;