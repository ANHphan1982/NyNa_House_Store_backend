// backend/src/users/passwordReset.js
const nodemailer = require('nodemailer');

/**
 * 🔑 PASSWORD RESET UTILITIES
 */

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Đặt lại mật khẩu - NyNA House Store',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Đặt lại mật khẩu</h2>
          <p>Xin chào <strong>${user.name}</strong>,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Đặt Lại Mật Khẩu
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Hoặc copy link sau vào trình duyệt:</p>
          <p style="background: #f3f4f6; padding: 10px; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>
          
          <p style="color: #dc2626; font-size: 14px;">⏰ Link này sẽ hết hạn sau 1 giờ.</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-weight: bold;">⚠️ Lưu ý bảo mật:</p>
            <ul style="color: #991b1b; margin: 10px 0;">
              <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              <li>Không chia sẻ link này với bất kỳ ai</li>
              <li>Liên hệ support nếu bạn nghi ngờ tài khoản bị xâm nhập</li>
            </ul>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">📧 Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', user.email);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail
};