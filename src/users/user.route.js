const express = require('express');
const router = express.Router();
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/verifyAdminToken');

// Validation middleware
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Tên không được để trống'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
];

const validatePhone = body('phone')
  .matches(/^(0[3|5|7|8|9])[0-9]{8}$/)
  .withMessage('Số điện thoại không hợp lệ');

const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Email không hợp lệ');

// Register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, phone, password, registerType } = req.body;

    // Check if user already exists
    let existingUser;
    if (registerType === 'email') {
      existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email đã được đăng ký' 
        });
      }
    } else if (registerType === 'phone') {
      existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Số điện thoại đã được đăng ký' 
        });
      }
    }

    // Create new user
    const newUser = new User({
      name,
      email: registerType === 'email' ? email : undefined,
      phone: registerType === 'phone' ? phone : undefined,
      password,
      registerType,
      role: 'user'
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi đăng ký' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản không tồn tại' 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Mật khẩu không chính xác' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản đã bị vô hiệu hóa' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi đăng nhập' 
    });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
      role: 'admin'
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản admin không tồn tại' 
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Mật khẩu không chính xác' 
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập admin thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi đăng nhập' 
    });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, address, avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, address, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi cập nhật thông tin' 
    });
  }
});

module.exports = router;