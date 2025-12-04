// backend/src/config/security.js
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');

/**
 * 🔒 SECURITY CONFIGURATION
 * Central configuration for all security middleware
 */

// ✅ RATE LIMITING CONFIGURATIONS
const rateLimiters = {
  // General API rate limit - 100 requests per 15 minutes
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      message: 'Quá nhiều requests từ IP này. Vui lòng thử lại sau 15 phút.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health check
      return req.path === '/health' || req.path === '/api/health';
    }
  }),

  // Authentication rate limit - 5 attempts per 15 minutes
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Only count failed requests
    message: {
      success: false,
      message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + identifier to prevent account enumeration
      return req.ip + (req.body.identifier || req.body.email || '');
    }
  }),

  // Registration rate limit - 3 registrations per hour per IP
  register: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
      success: false,
      message: 'Quá nhiều tài khoản được tạo từ IP này. Vui lòng thử lại sau 1 giờ.'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Order creation rate limit - 10 orders per hour
  orders: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      message: 'Bạn đã tạo quá nhiều đơn hàng. Vui lòng thử lại sau.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Allow admins to bypass
      return req.role === 'admin';
    }
  }),

  // OTP request rate limit - 3 OTP requests per 5 minutes
  otp: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,
    message: {
      success: false,
      message: 'Quá nhiều yêu cầu gửi mã OTP. Vui lòng thử lại sau 5 phút.'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Admin actions rate limit - 200 requests per 15 minutes
  admin: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
      success: false,
      message: 'Quá nhiều thao tác admin. Vui lòng thử lại sau.'
    },
    standardHeaders: true,
    legacyHeaders: false
  })
};

// ✅ CORS CONFIGURATION
const getCorsOptions = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ny-na-house-store-frontend.vercel.app',
    'https://ny-na-house-store-frontend-git-main-phan-anhs-projects-2ab2071f.vercel.app'
  ].filter(Boolean); // Remove undefined

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  };
};

// ✅ HELMET CONFIGURATION
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// ✅ MONGO SANITIZE OPTIONS
const mongoSanitizeOptions = {
  replaceWith: '_', // Replace $ and . with _
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Sanitized key: ${key} in request from ${req.ip}`);
  }
};

/**
 * 🔒 SETUP ALL SECURITY MIDDLEWARE
 * @param {Express} app - Express application instance
 */
const setupSecurity = (app) => {
  console.log('🔒 Setting up security middleware...');

  // 1. HELMET - Set security HTTP headers
  app.use(helmet(helmetConfig));
  console.log('  ✅ Helmet configured');

  // 2. CORS - Cross-Origin Resource Sharing
  app.use(cors(getCorsOptions()));
  console.log('  ✅ CORS configured');

  // 3. MONGO SANITIZE - Prevent NoSQL injection
  app.use(mongoSanitize(mongoSanitizeOptions));
  console.log('  ✅ MongoDB sanitization enabled');

  // 4. XSS CLEAN - Prevent XSS attacks
  app.use(xss());
  console.log('  ✅ XSS protection enabled');

  // 5. GENERAL RATE LIMITING
  app.use('/api/', rateLimiters.general);
  console.log('  ✅ General rate limiting enabled');

  // 6. PARAMETER POLLUTION PREVENTION
  app.use((req, res, next) => {
    // Prevent array parameter pollution
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (Array.isArray(req.query[key])) {
          // Keep only first value if array
          req.query[key] = req.query[key][0];
        }
      });
    }
    next();
  });
  console.log('  ✅ Parameter pollution prevention enabled');

  // 7. SECURITY HEADERS
  app.use((req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
  });
  console.log('  ✅ Additional security headers set');

  console.log('✅ Security middleware setup complete\n');
};

/**
 * 🔒 GET SPECIFIC RATE LIMITER
 * @param {string} type - Type of rate limiter (auth, orders, etc.)
 */
const getRateLimiter = (type) => {
  return rateLimiters[type] || rateLimiters.general;
};

// ✅ TRUST PROXY SETUP (for deployment on Render, Vercel, etc.)
const setupTrustProxy = (app) => {
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
    console.log('✅ Trust proxy enabled for production');
  }
};

// 🔥 THÊM ALIASES ĐỂ DỄ IMPORT
const generalLimiter = rateLimiters.general;
const authLimiter = rateLimiters.auth;
const registerLimiter = rateLimiters.register;
const orderLimiter = rateLimiters.orders;
const otpLimiter = rateLimiters.otp;
const adminLimiter = rateLimiters.admin;
const emailLimiter = rateLimiters.otp; 

// 🔥 EXPORT TẤT CẢ (THÊM ALIASES)
module.exports = {
  setupSecurity,
  getRateLimiter,
  rateLimiters,
  setupTrustProxy,
  // 🔥 Export aliases để dễ import
  generalLimiter,
  authLimiter,
  registerLimiter,
  orderLimiter,
  emailLimiter,
  otpLimiter,
  adminLimiter
};