// backend/src/users/user.route.js
const express = require('express');
const router = express.Router();
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/verifyToken');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

// 🔒 IMPORT SECURITY
const { authLimiter } = require('../config/security');
const emailLimiter = authLimiter; // Dùng tạm authLimiter thay emailLimiter

// 🔒 IMPORT VALIDATION
const {
  validateEmail,
  validatePhone,
  validatePassword,
  validateLoginData,
  validateRegistrationData,
  sanitizeName
} = require('../utils/validation');

console.log('✅ User routes loaded with 2FA OTP system');

// =====================================
// EMAIL CONFIGURATION (for 2FA OTP)
// =====================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service configured and ready');
  }
});

// =====================================
// OTP STORE (In-memory)
// =====================================
const otpStore = new Map();

// Clean expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiry < now) {
      otpStore.delete(email);
      console.log('🗑️ Expired OTP removed for:', email);
    }
  }
}, 10 * 60 * 1000);

// =====================================
// ROUTE 1: USER LOGIN (No 2FA)
// =====================================
router.post('/login', authLimiter, async (req, res) => {
  try {
    console.log('🔐 User login attempt');
    
    const { identifier, password } = req.body;

    // ✅ Validate input
    const validation = validateLoginData({ identifier, password });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0]
      });
    }

    // ✅ Clean identifier (preserve dots for email)
    const cleanIdentifier = identifier.trim().toLowerCase();
    
    console.log('📧 Looking for user:', cleanIdentifier);

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: identifier.trim() }
      ]
    });

    // Generic error message (don't reveal if user exists)
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    console.log('✅ User found:', user.email || user.phone);

    // Check if account is locked
    if (user.isLocked) {
      console.log('🔒 Account is locked');
      return res.status(423).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng thử lại sau.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      
      // Increment failed login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    console.log('✅ Password valid');

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ User login successful');

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// ROUTE 2: USER REGISTER
// =====================================
router.post('/register', authLimiter, async (req, res) => {
  try {
    console.log('📝 User registration attempt');
    
    const { name, email, phone, password } = req.body;

    // ✅ Sanitize and prepare data
    const sanitizedData = {
      name: sanitizeName(name),
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone ? phone.trim() : undefined,
      password: password
    };

    console.log('📋 Registration data:', {
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      hasPassword: !!sanitizedData.password
    });

    // ✅ Validate input
    const validation = validateRegistrationData(sanitizedData);
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0],
        errors: validation.errors
      });
    }

    // Determine registerType
    const registerType = sanitizedData.email ? 'email' : 'phone';

    // Check for duplicate email/phone
    const duplicateConditions = [];
    if (sanitizedData.email) {
      duplicateConditions.push({ email: sanitizedData.email });
    }
    if (sanitizedData.phone) {
      duplicateConditions.push({ phone: sanitizedData.phone });
    }

    if (duplicateConditions.length > 0) {
      const existingUser = await User.findOne({ $or: duplicateConditions });
      
      if (existingUser) {
        console.log('❌ Duplicate user found');
        
        if (existingUser.email === sanitizedData.email) {
          return res.status(400).json({
            success: false,
            message: 'Email đã được sử dụng'
          });
        }
        
        if (existingUser.phone === sanitizedData.phone) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại đã được sử dụng'
          });
        }
      }
    }

    // Create new user
    const newUser = new User({
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      password: sanitizedData.password,
      registerType: registerType,
      role: 'user'
    });

    await newUser.save();
    console.log('✅ User created:', newUser._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Registration successful');

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã được sử dụng`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// ROUTE 3: ADMIN LOGIN - Step 1 (Send OTP) 🔥 WITH DEBUG
// =====================================
router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    console.log('🔐 Admin login attempt - Step 1: Validate credentials');
    console.log('═══════════════════════════════════════════════════════');
    
    const { identifier, password } = req.body;

    // 🔥 DEBUG - Raw input
    console.log('📥 RAW INPUT:');
    console.log('   Identifier:', identifier);
    console.log('   Identifier length:', identifier?.length);
    console.log('   Password exists:', !!password);
    console.log('   Password length:', password?.length);

    // ✅ Validate input
    const validation = validateLoginData({ identifier, password });
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0]
      });
    }

    console.log('✅ Validation passed');

    // ✅ Clean identifier (preserve dots for email)
    const cleanIdentifier = identifier.trim().toLowerCase();
    
    console.log('📧 CLEANED INPUT:');
    console.log('   Clean identifier:', cleanIdentifier);
    console.log('   Clean identifier length:', cleanIdentifier.length);

    // 🔥 DEBUG - Test various queries
    console.log('🔍 TESTING QUERIES:');
    
    // Test 1: Find by email only (no conditions)
    const testEmail = await User.findOne({ email: cleanIdentifier });
    console.log('   Test 1 - Email only:', !!testEmail);
    if (testEmail) {
      console.log('      → Found user:', {
        id: testEmail._id,
        email: testEmail.email,
        role: testEmail.role,
        isActive: testEmail.isActive
      });
    }

    // Test 2: Find by role only
    const testRole = await User.findOne({ role: 'admin' });
    console.log('   Test 2 - Role only:', !!testRole);
    if (testRole) {
      console.log('      → Found admin:', {
        id: testRole._id,
        email: testRole.email,
        role: testRole.role,
        isActive: testRole.isActive
      });
    }

    // Test 3: Find by email + role
    const testEmailRole = await User.findOne({ 
      email: cleanIdentifier,
      role: 'admin'
    });
    console.log('   Test 3 - Email + Role:', !!testEmailRole);
    if (testEmailRole) {
      console.log('      → Found:', {
        id: testEmailRole._id,
        email: testEmailRole.email,
        role: testEmailRole.role,
        isActive: testEmailRole.isActive
      });
    }

    // Test 4: Count all admins
    const adminCount = await User.countDocuments({ role: 'admin' });
    console.log('   Test 4 - Admin count:', adminCount);

    // Test 5: List all admins
    const allAdmins = await User.find({ role: 'admin' }).select('email role isActive');
    console.log('   Test 5 - All admins:');
    allAdmins.forEach((admin, index) => {
      console.log(`      ${index + 1}. ${admin.email} | role: ${admin.role} | active: ${admin.isActive}`);
    });

    console.log('🎯 FINAL QUERY:');
    console.log('   Query object:', JSON.stringify({
      $or: [
        { email: cleanIdentifier },
        { phone: identifier.trim() }
      ],
      role: 'admin',
      isActive: true
    }, null, 2));

    // Find admin user with final query
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: identifier.trim() }
      ],
      role: 'admin',
      isActive: true
    });

    console.log('🔎 FINAL RESULT:', !!user);
    if (user) {
      console.log('   User found:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });
    }

    if (!user) {
      console.log('❌ ADMIN NOT FOUND');
      console.log('   Possible reasons:');
      console.log('   1. Email mismatch (check Test 1)');
      console.log('   2. Role is not "admin" (check Test 2)');
      console.log('   3. isActive is not true');
      console.log('   4. Admin does not exist (check Test 4 & 5)');
      console.log('═══════════════════════════════════════════════════════');
      
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    console.log('✅ Admin found:', user.email);

    // Check if account is locked
    if (user.isLocked) {
      console.log('🔒 Account is locked');
      return res.status(423).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng thử lại sau.'
      });
    }

    // Verify password
    console.log('🔑 Verifying password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      
      // Increment failed login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    console.log('✅ Password valid - Generating OTP');

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    console.log('🔐 Generated OTP:', otp);

    // Store OTP with expiry (5 minutes)
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    otpStore.set(user.email, {
      otp,
      expiry: otpExpiry,
      attempts: 0,
      userId: user._id
    });

    // Send OTP email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: 'Mã xác thực đăng nhập Admin - NyNA House Store',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Mã xác thực đăng nhập Admin</h2>
            <p>Xin chào <strong>${user.name}</strong>,</p>
            <p>Mã OTP của bạn là:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #dc2626;">⏰ Mã này sẽ hết hạn sau 5 phút.</p>
            <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">📧 Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        `
      });
      
      console.log('✅ OTP email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('❌ Error sending OTP email:', emailError);
      otpStore.delete(user.email);
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi mã xác thực. Vui lòng thử lại sau.'
      });
    }

    // Mask email for response
    const maskedEmail = user.email.replace(/(.{3})(.*)(@.*)/, '$1***$3');

    console.log('✅ Step 1 complete - OTP sent');
    console.log('═══════════════════════════════════════════════════════');

    res.json({
      success: true,
      requireOTP: true,
      message: 'Mã xác thực đã được gửi đến email của bạn',
      email: maskedEmail,
      expiresIn: 300
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// ROUTE 4: ADMIN VERIFY OTP - Step 2
// =====================================
router.post('/admin/verify-otp', authLimiter, async (req, res) => {
  try {
    console.log('🔐 Admin OTP verification - Step 2');
    
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email và OTP là bắt buộc'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    console.log('📧 Verifying OTP for:', cleanEmail);

    // Get OTP data from store
    const otpData = otpStore.get(cleanEmail);

    if (!otpData) {
      console.log('❌ No OTP found for this email');
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
      });
    }

    // Check if OTP expired
    if (Date.now() > otpData.expiry) {
      console.log('❌ OTP expired');
      otpStore.delete(cleanEmail);
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.'
      });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      console.log('❌ Too many OTP attempts');
      otpStore.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        message: 'Quá nhiều lần nhập sai. Vui lòng đăng nhập lại.'
      });
    }

    // Verify OTP
    if (cleanOtp !== otpData.otp) {
      console.log('❌ Invalid OTP');
      otpData.attempts += 1;
      otpStore.set(cleanEmail, otpData);
      
      return res.status(401).json({
        success: false,
        message: `Mã xác thực không đúng. Còn ${3 - otpData.attempts} lần thử.`
      });
    }

    console.log('✅ OTP verified');

    // Get user
    const user = await User.findById(otpData.userId);
    
    if (!user) {
      console.log('❌ User not found');
      otpStore.delete(cleanEmail);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Delete OTP after successful verification
    otpStore.delete(cleanEmail);

    // Reset login attempts
    await user.resetLoginAttempts();

    // Generate JWT token for admin
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '24h' }
    );

    console.log('✅ Admin login successful');

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// ROUTE 5: ADMIN RESEND OTP - Step 3
// =====================================
router.post('/admin/resend-otp', emailLimiter, async (req, res) => {
  try {
    console.log('🔄 Admin resend OTP request');
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log('📧 Resending OTP to:', cleanEmail);

    // Check if there's an existing OTP
    const existingOtpData = otpStore.get(cleanEmail);
    
    // Rate limiting: Don't allow resend within 1 minute
    if (existingOtpData) {
      const timeSinceLastOtp = Date.now() - (existingOtpData.expiry - 5 * 60 * 1000);
      if (timeSinceLastOtp < 60 * 1000) {
        return res.status(429).json({
          success: false,
          message: 'Vui lòng đợi 1 phút trước khi gửi lại mã'
        });
      }
    }

    // Find admin user
    const user = await User.findOne({
      email: cleanEmail,
      role: 'admin',
      isActive: true
    });

    if (!user) {
      console.log('❌ Admin not found');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản admin'
      });
    }

    // Generate new OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    console.log('🔐 Generated new OTP:', otp);

    // Store new OTP
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    otpStore.set(cleanEmail, {
      otp,
      expiry: otpExpiry,
      attempts: 0,
      userId: user._id
    });

    // Send OTP email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: 'Mã xác thực mới - NyNA House Store',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Mã xác thực mới</h2>
            <p>Xin chào <strong>${user.name}</strong>,</p>
            <p>Mã OTP mới của bạn là:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #dc2626;">⏰ Mã này sẽ hết hạn sau 5 phút.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">📧 Email này được gửi tự động.</p>
          </div>
        `
      });
      
      console.log('✅ New OTP sent successfully');
    } catch (emailError) {
      console.error('❌ Error sending OTP:', emailError);
      otpStore.delete(cleanEmail);
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi mã. Vui lòng thử lại sau.'
      });
    }

    res.json({
      success: true,
      message: 'Mã xác thực mới đã được gửi',
      expiresIn: 300
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    });
  }
});

// =====================================
// DEBUG ROUTES (Development only)
// =====================================
if (process.env.NODE_ENV !== 'production') {
  // Get all users (for debugging)
  router.get('/debug/all', async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json({
        success: true,
        count: users.length,
        users
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get OTP store (for debugging)
  router.get('/debug/otp', (req, res) => {
    const otps = [];
    for (const [email, data] of otpStore.entries()) {
      otps.push({
        email,
        otp: data.otp,
        expiresAt: new Date(data.expiry),
        attempts: data.attempts
      });
    }
    res.json({ success: true, otps });
  });
}

module.exports = router;