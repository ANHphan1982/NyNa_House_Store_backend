// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser'); // 🔥 NEW: Add cookie-parser
require('dotenv').config();

// 🔒 IMPORT SECURITY CONFIGURATION
const { setupSecurity } = require('./src/config/security');

// 📧 IMPORT EMAIL SERVICE
const { verifyEmailConfig } = require('./src/services/emailService');

const app = express();
const port = process.env.PORT || 5000;
// =========================================
// 1. TRUST PROXY (MUST BE FIRST!)
// =========================================
// =========================================
// 🔥 FIX: Add trust proxy directly here
app.set('trust proxy', 1);
console.log('✅ Trust proxy enabled: 1 (first proxy only)');
// 2. SECURITY MIDDLEWARE
// =========================================
console.log('🔒 Initializing security...');
setupSecurity(app);



// =========================================
// 2. COOKIE PARSER (BEFORE ROUTES)
// =========================================
app.use(cookieParser()); // 🔥 NEW: Parse cookies
console.log('🍪 Cookie parser initialized');

// =========================================
// 3. BODY PARSER (AFTER SECURITY)
// =========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =========================================
// 4. REQUEST LOGGER
// =========================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin || 'No origin';
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${origin}`);
  next();
});

// =========================================
// 5. IMPORT ROUTES
// =========================================
const productRoutes = require('./src/products/product.route');
const orderRoutes = require('./src/orders/order.route');
const userRoutes = require('./src/users/user.route');
const adminRoutes = require('./src/admin/admin.route');

// =========================================
// 6. MOUNT ROUTES
// =========================================
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', require('./src/uploads/upload.route'));
// =========================================
// 7. ROOT & HEALTH CHECK ROUTES
// =========================================

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'NyNA House Store API - Secure E-commerce Backend',
    version: '2.0.0',
    status: 'running',
    security: {
      cors: 'enabled',
      rateLimiting: 'enabled',
      xssProtection: 'enabled',
      mongoSanitization: 'enabled',
      helmet: 'enabled',
      httpOnlyCookies: 'enabled' // 🔥 NEW
    },
    features: {
      '2FA': 'Email OTP verification',
      'Admin': 'Two-factor authentication',
      'Products': 'CRUD operations',
      'Orders': 'Order management with validation',
      'Users': 'Authentication & authorization',
      'Security': 'Rate limiting, input sanitization, httpOnly cookies', // 🔥 UPDATED
      'Cookies': 'Secure JWT storage in httpOnly cookies' // 🔥 NEW
    },
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      auth: '/api/auth',
      admin: '/api/admin',
      health: '/health'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      email: process.env.EMAIL_USER ? 'configured' : 'not configured',
      cookies: process.env.COOKIE_SECRET ? 'configured' : 'not configured' // 🔥 NEW
    },
    memory: {
      used: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  };
  
  res.json(healthStatus);
});

// =========================================
// 8. ERROR HANDLERS
// =========================================

// 404 handler
app.use((req, res, next) => {
  console.log(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableEndpoints: {
      products: '/api/products',
      orders: '/api/orders',
      auth: '/api/auth',
      admin: '/api/admin'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Log stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed'
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hạn'
    });
  }
  
  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} đã tồn tại trong hệ thống`
    });
  }
  
  // Generic error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Đã xảy ra lỗi, vui lòng thử lại sau'
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// =========================================
// 9. SERVER STARTUP
// =========================================

let server;

const startServer = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 Starting NyNA House Store Backend Server...');
    console.log('='.repeat(70));
    
    // Step 1: Connect to MongoDB
    console.log('\n📊 Step 1: Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    
    // Step 2: Verify Email Service
    console.log('\n📧 Step 2: Verifying email service...');
    const emailReady = await verifyEmailConfig();
    
    if (emailReady) {
      console.log('✅ Email service configured and ready');
      console.log(`📨 Email user: ${process.env.EMAIL_USER}`);
    } else {
      console.warn('⚠️ Email service not configured properly');
      console.warn('💡 2FA features will not work without email configuration');
      console.warn('📝 Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    }
    
    // 🔥 NEW: Step 3: Verify Cookie Configuration
    console.log('\n🍪 Step 3: Verifying cookie configuration...');
    if (process.env.COOKIE_SECRET) {
      console.log('✅ Cookie secret configured');
      console.log(`🔒 Cookie max age: ${process.env.COOKIE_MAX_AGE || '7 days'}`);
      console.log(`🌐 Cookie domain: ${process.env.COOKIE_DOMAIN || 'default'}`);
    } else {
      console.warn('⚠️ COOKIE_SECRET not set');
      console.warn('💡 Cookies will still work but consider setting COOKIE_SECRET for signing');
    }
    
    // Step 4: Start HTTP Server
    console.log('\n🌐 Step 4: Starting HTTP server...');
    server = app.listen(port, () => {
      console.log('✅ HTTP server started successfully');
      console.log('\n' + '='.repeat(70));
      console.log('🎉 SERVER IS READY!');
      console.log('='.repeat(70));
      console.log(`📍 Port: ${port}`);
      console.log(`🔗 API URL: ${process.env.API_URL || `http://localhost:${port}`}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n🔒 Security Features:`);
      console.log(`   ✓ Rate Limiting (100 req/15min general, 5 req/15min auth)`);
      console.log(`   ✓ XSS Protection`);
      console.log(`   ✓ NoSQL Injection Prevention`);
      console.log(`   ✓ CORS Protection`);
      console.log(`   ✓ Helmet Security Headers`);
      console.log(`   ✓ Input Validation & Sanitization`);
      console.log(`   ✓ HttpOnly Cookies (JWT Storage)`); // 🔥 NEW
      console.log(`\n📱 Features:`);
      console.log(`   ✓ Two-Factor Authentication (2FA) via Email`);
      console.log(`   ✓ Admin OTP Verification`);
      console.log(`   ✓ Secure JWT Tokens (in httpOnly cookies)`); // 🔥 UPDATED
      console.log(`   ✓ Password Policy (8+ chars, uppercase, lowercase, number, special char)`);
      console.log(`\n📚 API Endpoints:`);
      console.log(`   🛍️  Products: /api/products`);
      console.log(`   📦 Orders: /api/orders`);
      console.log(`   👤 Auth: /api/auth`);
      console.log(`   🔐 Admin: /api/admin`);
      console.log(`   ❤️  Health: /health`);
      console.log('='.repeat(70) + '\n');
    });
    
  } catch (error) {
    console.error('\n❌ Server startup error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n💡 Common issues:');
    console.error('   - Check MONGODB_URI in .env file');
    console.error('   - Ensure MongoDB is accessible');
    console.error('   - Verify all environment variables are set');
    console.error('   - Check network connectivity\n');
    process.exit(1);
  }
};

// Start the server
startServer();

// =========================================
// 10. PROCESS EVENT HANDLERS
// =========================================

process.on('unhandledRejection', (err) => {
  console.error('\n❌ Unhandled Promise Rejection:', err.message);
  console.error('Stack:', err.stack);
  
  if (server) {
    console.log('🔄 Closing server gracefully...');
    server.close(() => {
      console.log('💤 Server closed');
      // 🔥 FIX: Remove callback from mongoose close()
      mongoose.connection.close()
        .then(() => {
          console.log('💤 MongoDB connection closed');
          process.exit(1);
        })
        .catch((err) => {
          console.error('❌ Error closing MongoDB:', err);
          process.exit(1);
        });
    });
  } else {
    process.exit(1);
  }
});

// Handle SIGTERM (Production shutdown signal)
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('💤 HTTP server closed');
      
      // 🔥 FIX: Remove callback from mongoose close()
      mongoose.connection.close()
        .then(() => {
          console.log('💤 MongoDB connection closed');
          console.log('✅ Graceful shutdown complete\n');
          process.exit(0);
        })
        .catch((err) => {
          console.error('❌ Error closing MongoDB:', err);
          process.exit(1);
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

// Handle SIGINT (Ctrl+C in development)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received (Ctrl+C), shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('💤 HTTP server closed');
      
      // 🔥 FIX: Remove callback from mongoose close()
      mongoose.connection.close()
        .then(() => {
          console.log('💤 MongoDB connection closed');
          console.log('✅ Graceful shutdown complete\n');
          process.exit(0);
        })
        .catch((err) => {
          console.error('❌ Error closing MongoDB:', err);
          process.exit(1);
        });
    });
  } else {
    process.exit(0);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  console.error('⚠️ Application will exit...\n');
  
  // Log error to monitoring service here if available
  
  process.exit(1);
});

// Export app for testing
module.exports = app;