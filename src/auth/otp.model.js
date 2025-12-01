// backend/src/auth/otp.model.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 phút
    index: { expires: 0 } // MongoDB tự động xóa sau khi hết hạn
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
otpSchema.index({ email: 1, verified: 1 });
otpSchema.index({ expiresAt: 1 });

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;