// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// 🔥 CORS CONFIGURATION - FIX
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ny-na-house-store-frontend.vercel.app',  // ✅ Bỏ dấu /
  /\.vercel\.app$/  // ✅ Regex để cho phép tất cả preview deployments
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

// 🔥 REQUEST LOGGER (helpful for debugging)
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
    version: '1.0.0',
    cors: 'enabled',
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
    uptime: process.uptime()
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

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('📦 Database:', mongoose.connection.name);
    
    // 🔥 ASSIGN SERVER INSTANCE
    server = app.listen(port, () => {
      console.log('='.repeat(60));
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📍 API: https://nyna-house-store-backend-3.onrender.com`);
      console.log(`🌐 CORS enabled for:`, allowedOrigins.map(o => o.toString()).join(', '));
      console.log('='.repeat(60));
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// 🔥 HANDLE UNHANDLED PROMISE REJECTIONS
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// 🔥 HANDLE SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('💤 Process terminated');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        process.exit(0);
      });
    });
  }
});

// 🔥 HANDLE SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('💤 Process terminated');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        process.exit(0);
      });
    });
  }
});