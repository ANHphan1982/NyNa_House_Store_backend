// backend/src/middleware/verifyAdminToken.js
const jwt = require('jsonwebtoken');

// Verify Admin Token
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('🔐 [Admin] Verifying token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token xác thực' 
      });
    }

    // 🔥 TRY JWT_ADMIN_SECRET FIRST
    jwt.verify(token, process.env.JWT_ADMIN_SECRET, (err, decoded) => {
      if (!err) {
        // Check role
        if (decoded.role !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            message: 'Bạn không có quyền truy cập' 
          });
        }

        console.log('✅ [Admin] Verified with JWT_ADMIN_SECRET');
        req.userId = decoded.userId;
        req.role = decoded.role;
        return next();
      }

      // 🔥 FALLBACK: TRY JWT_SECRET
      console.log('⚠️  [Admin] Trying JWT_SECRET fallback...');
      jwt.verify(token, process.env.JWT_SECRET, (err2, decoded2) => {
        if (err2) {
          console.error('❌ [Admin] Token verification failed:', err2.message);
          return res.status(401).json({ 
            success: false, 
            message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' 
          });
        }

        // Check role
        if (decoded2.role !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            message: 'Bạn không có quyền truy cập' 
          });
        }

        console.log('✅ [Admin] Verified with JWT_SECRET (fallback)');
        req.userId = decoded2.userId;
        req.role = decoded2.role;
        next();
      });
    });
  } catch (error) {
    console.error('❌ [Admin] Verify token error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Lỗi xác thực token' 
    });
  }
};

// Verify User Token
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('🔐 [User] Verifying token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token xác thực' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('❌ [User] Token verification error:', err.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Token không hợp lệ hoặc đã hết hạn' 
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
      message: 'Lỗi xác thực token' 
    });
  }
};

module.exports = { verifyAdminToken, verifyToken };