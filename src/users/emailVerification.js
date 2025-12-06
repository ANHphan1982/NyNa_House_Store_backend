// backend/src/users/emailVerification.js
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 📧 EMAIL VERIFICATION UTILITIES
 */

// Email transporter (reuse from user.route.js)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send Verification Email
 */
const sendVerificationEmail = async (user, verificationToken) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Xác thực tài khoản - NyNA House Store',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Xác thực tài khoản của bạn</h2>
          <p>Xin chào <strong>${user.name}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại NyNA House Store!</p>
          <p>Vui lòng click vào nút bên dưới để xác thực email của bạn:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Xác Thực Email
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Hoặc copy link sau vào trình duyệt:</p>
          <p style="background: #f3f4f6; padding: 10px; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>
          
          <p style="color: #dc2626; font-size: 14px;">⏰ Link này sẽ hết hạn sau 24 giờ.</p>
          
          <div style="border-top: 1px solid #e5e7eb; margin: 30px 0; padding-top: 20px;">
            <h3 style="color: #059669; font-size: 16px;">✨ Lợi ích khi xác thực email:</h3>
            <ul style="color: #374151;">
              <li>✅ Xem lịch sử đơn hàng chi tiết</li>
              <li>✅ Nhận thông báo về đơn hàng</li>
              <li>✅ Tích điểm và nhận voucher</li>
              <li>✅ Khôi phục mật khẩu dễ dàng</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.
          </p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">📧 Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', user.email);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resend Verification Email
 */
const resendVerificationEmail = async (user, verificationToken) => {
  return sendVerificationEmail(user, verificationToken);
};

module.exports = {
  sendVerificationEmail,
  resendVerificationEmail
};