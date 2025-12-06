// backend/src/middleware/checkEmailVerification.js

/**
 * 🔒 CHECK EMAIL VERIFICATION MIDDLEWARE
 * Kiểm tra user đã verify email chưa
 * Dùng để gate các features cao cấp
 */

const User = require('../users/user.model');

/**
 * Require Email Verification
 * Block request nếu email chưa verified
 */
const requireEmailVerification = async (req, res, next) => {
  try {
    // Get user from database
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if user registered with phone (skip verification)
    if (user.registerType === 'phone') {
      console.log('ℹ️ User registered with phone - skipping email verification check');
      return next();
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      console.log('⚠️ Email not verified for user:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Bạn cần xác thực email để sử dụng tính năng này',
        requiresVerification: true,
        email: user.email
      });
    }

    console.log('✅ Email verified - access granted');
    next();
    
  } catch (error) {
    console.error('❌ Check email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi'
    });
  }
};

/**
 * Check Email Verification Status
 * Không block, chỉ thêm thông tin vào req
 */
const checkEmailVerificationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (user) {
      req.isEmailVerified = user.isEmailVerified;
      req.registerType = user.registerType;
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Check verification status error:', error);
    next(); // Continue anyway
  }
};

module.exports = {
  requireEmailVerification,
  checkEmailVerificationStatus
};