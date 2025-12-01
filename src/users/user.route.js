// backend/src/users/user.route.js
const express = require('express');
const router = express.Router();
const User = require('./user.model');
const OTP = require('../auth/otp.model');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const { sendOTPEmail } = require('../services/emailService');

// 🔥 USER LOGIN (Regular users - không cần 2FA)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    console.log('🔐 User login attempt:', identifier);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });

    if (!user) {
      console.log('❌ User not found');
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

    console.log('✅ Login successful');

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role || 'user',
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 🔥 ĐẢMBẢO USER OBJECT ĐẦY ĐỦ VỚI FIELD "name"
    const userObject = {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username || user.name || user.email?.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      name: user.name || user.username || user.email?.split('@')[0] // 🔥 CRITICAL
    };

    console.log('✅ Token generated for:', user.email);

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
      message: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

// 🔥 USER REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, email } = req.body;

    console.log('📝 Register attempt:', phone || email);

    // Validate required fields
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập số điện thoại hoặc email'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc số điện thoại đã được đăng ký'
      });
    }

    // Create new user
    const user = new User({
      name,
      username: name,
      email: email || `${phone}@temp.local`,
      phone: phone || '',
      password,
      role: 'user',
      registerType: phone ? 'phone' : 'email',
      isActive: true
    });

    await user.save();

    console.log('✅ User registered successfully');

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 🔥 USER OBJECT ĐẦY ĐỦ
    const userObject = {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username || user.name,
      email: user.email,
      phone: user.phone,
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
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

// 🔥 STEP 1: Admin Login - Gửi OTP
router.post('/admin/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    console.log('🔐 Admin login attempt:', identifier);

    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Find admin user
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
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

    console.log('🔢 OTP generated:', otp);

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
      await sendOTPEmail(user.email, otp, user.username || user.name || user.email.split('@')[0]);
      console.log('✅ OTP email sent successfully');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi mã xác thực. Vui lòng thử lại.'
      });
    }

    // 🔥 RESPONSE với requireOTP flag
    const responseData = {
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn',
      requireOTP: true,
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      expiresIn: 300 // 5 minutes in seconds
    };

    console.log('📤 Sending response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

// 🔥 STEP 2: Verify OTP và trả về token
router.post('/admin/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔐 OTP verification attempt:', email);

    // Validate input
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

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '1d' }
    );

    console.log('✅ Token generated for:', user.email);

    // 🔥 ĐẢMBẢO USER OBJECT ĐẦY ĐỦ VỚI FIELD "name"
    const userObject = {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      name: user.name || user.username || user.email.split('@')[0] // 🔥 CRITICAL
    };

    const responseData = {
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: userObject
    };

    console.log('📤 Sending verify-otp response with user:', userObject);

    res.json(responseData);

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.'
    });
  }
});

// 🔥 STEP 3: Resend OTP
router.post('/admin/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔄 Resend OTP request:', email);

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

    // Check rate limit (không cho gửi quá nhanh)
    const recentOTP = await OTP.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) } // 1 minute ago
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
    await sendOTPEmail(user.email, otp, user.username || user.name || user.email.split('@')[0]);

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

module.exports = router;