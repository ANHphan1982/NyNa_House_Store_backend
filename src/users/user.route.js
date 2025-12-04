// backend/src/users/user.route.js
const express = require('express');
const router = express.Router();
const User = require('./user.model');
const OTP = require('../auth/otp.model');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const { sendOTPEmail } = require('../services/emailService');

// 🔒 IMPORT SECURITY
//const { authLimiter, emailLimiter } = require('../config/security');
const { authLimiter, emailLimiter } = require('../config/security');
const {
  validateEmail,
  validatePhone,
  validatePassword,
  validateRegistrationData,
  validateLoginData,
  sanitizeString,
  sanitizeName
} = require('../utils/validation');

console.log('✅ User routes loaded with 2FA OTP system');

// =====================================
// 1. USER LOGIN (No 2FA for regular users)
// =====================================
router.post('/login', authLimiter, async (req, res) => {
  try {
    console.log('🔐 User login attempt');

    // 🔒 SANITIZE INPUT
    const identifier = sanitizeString(req.body.identifier, 255);
    const password = req.body.password;

    // 🔒 VALIDATE INPUT
    const validation = validateLoginData({ identifier, password });
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0]
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      console.log('❌ Account inactive');
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password incorrect');
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    console.log('✅ Login successful:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role || 'user',
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // User object với đầy đủ field "name"
    const userObject = {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      name: user.name
    };

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: userObject
    });

  } catch (error) {
    console.error('❌ User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng nhập'
    });
  }
});

// =====================================
// 2. USER REGISTER
// =====================================
router.post('/register', authLimiter, async (req, res) => {
  try {
    console.log('📝 User registration attempt');
    
    // 🔒 SANITIZE INPUT
    const sanitizedData = {
      name: sanitizeName(req.body.name),
      email: req.body.email ? req.body.email.trim().toLowerCase() : '',
      phone: req.body.phone ? req.body.phone.trim() : '',
      password: req.body.password
    };

    console.log('🧹 Sanitized data:', { ...sanitizedData, password: '[HIDDEN]' });

    // 🔒 VALIDATE INPUT
    const validation = validateRegistrationData(sanitizedData);
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0],
        errors: validation.errors
      });
    }

    const { name, email, phone, password } = sanitizedData;

    // 🔒 CHECK DUPLICATE
    const checkConditions = [];

    if (email && email.trim() !== '') {
      checkConditions.push({ email: email.trim().toLowerCase() });
    }

    if (phone && phone.trim() !== '') {
      checkConditions.push({ phone: phone.trim() });
    }

    console.log('🔍 Checking existing user with conditions:', checkConditions);

    let existingUser = null;
    if (checkConditions.length > 0) {
      existingUser = await User.findOne({ $or: checkConditions });
    }

    if (existingUser) {
      let duplicateField = '';
      if (existingUser.email === email?.trim().toLowerCase()) {
        duplicateField = 'Email';
      } else if (existingUser.phone === phone?.trim()) {
        duplicateField = 'Số điện thoại';
      } else {
        duplicateField = 'Email hoặc số điện thoại';
      }
      
      console.log(`❌ Duplicate ${duplicateField} found`);
      return res.status(400).json({
        success: false,
        message: `${duplicateField} đã được đăng ký`
      });
    }

    console.log('✅ No existing user found, creating new user...');

    // Tạo email temp nếu cần
    const userEmail = email && email.trim() !== ''
      ? email.trim().toLowerCase()
      : `user_${phone}_${Date.now()}@temp.local`;

    const userPhone = phone && phone.trim() !== ''
      ? phone.trim()
      : null;

    const user = new User({
      name: name.trim(),
      email: userEmail,
      phone: userPhone,
      password,
      role: 'user',
      registerType: phone && phone.trim() ? 'phone' : 'email',
      isActive: true
    });

    await user.save();

    console.log('✅ User registered successfully:', user._id);

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const userObject = {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      name: user.name
    };

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: userObject
    });

  } catch (error) {
    console.error('❌ Register error:', error);

    // 🔒 Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const fieldName = field === 'email' ? 'Email' : field === 'phone' ? 'Số điện thoại' : 'Thông tin';
      
      return res.status(400).json({
        success: false,
        message: `${fieldName} đã được đăng ký`
      });
    }

    // 🔒 Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng ký: ' + error.message
    });
  }
});

// =====================================
// 3. ADMIN LOGIN - STEP 1: Send OTP
// =====================================
router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    console.log('🔐 Admin login attempt - Step 1: Validate credentials');

    // 🔒 SANITIZE INPUT
    const identifier = sanitizeString(req.body.identifier, 255);
    const password = req.body.password;

    // 🔒 VALIDATE INPUT
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Find admin user
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ],
      role: 'admin'
    });

    if (!user) {
      console.log('❌ Admin not found');
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password incorrect');
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    console.log('✅ Credentials valid, generating OTP...');

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    console.log('🔢 OTP generated');

    // Delete old OTPs for this user
    await OTP.deleteMany({ email: user.email, verified: false });

    // Save OTP to database
    const otpDoc = await OTP.create({
      email: user.email,
      otp,
      userId: user._id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    console.log('💾 OTP saved to database');

    // Send OTP via email
    try {
      await sendOTPEmail(
        user.email, 
        otp, 
        user.name || user.username || user.email.split('@')[0]
      );
      console.log('✅ OTP email sent successfully');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi mã xác thực. Vui lòng thử lại.'
      });
    }

    // Response với requireOTP flag
    res.json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn',
      requireOTP: true,
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      expiresIn: 300 // 5 minutes in seconds
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// 4. ADMIN LOGIN - STEP 2: Verify OTP
// =====================================
router.post('/admin/verify-otp', authLimiter, async (req, res) => {
  try {
    console.log('🔐 OTP verification attempt');

    // 🔒 SANITIZE INPUT
    const email = sanitizeString(req.body.email, 255).toLowerCase();
    const otp = sanitizeString(req.body.otp, 10);

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.log('❌ OTP not found or expired');
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
      });
    }

    // Check attempts (max 3 attempts)
    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({
        success: false,
        message: 'Bạn đã nhập sai quá 3 lần. Vui lòng đăng nhập lại.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp.trim()) {
      console.log('❌ OTP incorrect');
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      return res.status(401).json({
        success: false,
        message: `Mã xác thực không đúng. Còn ${3 - otpRecord.attempts} lần thử.`
      });
    }

    console.log('✅ OTP verified successfully');

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Get user
    const user = await User.findById(otpRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // Generate JWT token with ADMIN SECRET
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email
      },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '24h' }
    );

    console.log('✅ Admin token generated');

    const userObject = {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.name || user.username || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      name: user.name || user.username || user.email.split('@')[0]
    };

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: userObject
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// 5. ADMIN LOGIN - STEP 3: Resend OTP
// =====================================
router.post('/admin/resend-otp', emailLimiter, async (req, res) => {
  try {
    console.log('🔄 Resend OTP request');

    // 🔒 SANITIZE INPUT
    const email = sanitizeString(req.body.email, 255).toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    // Find user
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email không tồn tại'
      });
    }

    // Check rate limit (1 minute between requests)
    const recentOTP = await OTP.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Vui lòng đợi 1 phút trước khi gửi lại mã'
      });
    }

    // Generate new OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    // Delete old OTPs
    await OTP.deleteMany({ email, verified: false });

    // Save new OTP
    await OTP.create({
      email: user.email,
      otp,
      userId: user._id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // Send email
    await sendOTPEmail(
      user.email, 
      otp, 
      user.name || user.username || user.email.split('@')[0]
    );

    console.log('✅ OTP resent successfully');

    res.json({
      success: true,
      message: 'Mã xác thực mới đã được gửi đến email của bạn'
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi lại mã. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// 6. DEBUG ROUTES (Delete after testing)
// =====================================
router.get('/debug/check-phone/:phone', async (req, res) => {
  try {
    const phone = sanitizeString(req.params.phone, 20);
    console.log('🔍 Checking phone:', phone);
    
    const user = await User.findOne({ phone });
    
    res.json({
      exists: !!user,
      user: user ? {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/check-email/:email', async (req, res) => {
  try {
    const email = sanitizeString(req.params.email, 255).toLowerCase();
    console.log('🔍 Checking email:', email);
    
    const user = await User.findOne({ email });
    
    res.json({
      exists: !!user,
      user: user ? {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email phone role createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;