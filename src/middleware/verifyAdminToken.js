// backend/src/middleware/verifyAdminToken.js
const jwt = require('jsonwebtoken');

// Verify Admin Token (with Cookie Support)
const verifyAdminToken = (req, res, next) => {
  try {
    // 🔥 TRY COOKIE FIRST, then Authorization header
    let token = req.cookies?.adminToken;
    
    if (!token) {
      token = req.headers.authorization?.split(' ')[1];
    }
    
    console.log('🔐 [Admin] Verifying token:', token ? 'Token exists' : 'No token');
    console.log('🍪 [Admin] Token from cookie:', !!req.cookies?.adminToken);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // Try JWT_ADMIN_SECRET first
    jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('❌ [Admin] Token verification failed:', err.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' 
        });
      }

      // Check role
      if (decoded.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Không có quyền truy cập' 
        });
      }

      console.log('✅ [Admin] Token verified');
      req.userId = decoded.userId;
      req.role = decoded.role;
      next();
    });
  } catch (error) {
    console.error('❌ [Admin] Verify token error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Lỗi xác thực' 
    });
  }
};

// Verify User Token (with Cookie Support)
const verifyToken = (req, res, next) => {
  try {
    // 🔥 TRY COOKIE FIRST, then Authorization header
    let token = req.cookies?.userToken;
    
    if (!token) {
      token = req.headers.authorization?.split(' ')[1];
    }
    
    console.log('🔐 [User] Verifying token:', token ? 'Token exists' : 'No token');
    console.log('🍪 [User] Token from cookie:', !!req.cookies?.userToken);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('❌ [User] Token verification error:', err.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Phiên đăng nhập đã hết hạn' 
        });
      }

      console.log('✅ [User] Token verified');
      req.userId = decoded.userId;
      req.role = decoded.role;
      next();
    });
  } catch (error) {
    console.error('❌ [User] Verify token error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Lỗi xác thực' 
    });
  }
};

// 🔥 NEW: Verify Token Or Admin (Accept both) with Cookie Support
const verifyTokenOrAdmin = (req, res, next) => {
  try {
    // Try to get token from cookies or header
    let token = req.cookies?.adminToken || req.cookies?.userToken;
    
    if (!token) {
      token = req.headers.authorization?.split(' ')[1];
    }
    
    console.log('🔐 [TokenOrAdmin] Verifying token:', token ? 'Token exists' : 'No token');
    console.log('🍪 [TokenOrAdmin] Token from cookie:', !!(req.cookies?.adminToken || req.cookies?.userToken));
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // 🔥 TRY ADMIN TOKEN FIRST
    jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET, (err, decoded) => {
      if (!err && decoded.role === 'admin') {
        // Admin token valid
        console.log('✅ [TokenOrAdmin] Verified as Admin');
        req.userId = decoded.userId;
        req.role = decoded.role;
        req.isAdmin = true;
        return next();
      }

      // 🔥 FALLBACK: TRY USER TOKEN
      jwt.verify(token, process.env.JWT_SECRET, (err2, decoded2) => {
        if (err2) {
          console.error('❌ [TokenOrAdmin] Token verification failed:', err2.message);
          return res.status(401).json({ 
            success: false, 
            message: 'Phiên đăng nhập đã hết hạn' 
          });
        }

        // User token valid
        console.log('✅ [TokenOrAdmin] Verified as User');
        req.userId = decoded2.userId;
        req.role = decoded2.role || 'user';
        req.isAdmin = decoded2.role === 'admin';
        next();
      });
    });
  } catch (error) {
    console.error('❌ [TokenOrAdmin] Verify token error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Lỗi xác thực' 
    });
  }
};

module.exports = { 
  verifyAdminToken, 
  verifyToken,
  verifyTokenOrAdmin
};