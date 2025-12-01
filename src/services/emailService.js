// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

// 🔥 CẤU HÌNH EMAIL - Dùng Gmail hoặc SMTP khác
const transporter = nodemailer.createTransport({
  service: 'gmail', // Hoặc 'outlook', 'yahoo'
  auth: {
    user: process.env.EMAIL_USER, // Email của bạn
    pass: process.env.EMAIL_PASSWORD // App Password (không phải password thường)
  }
});

/**
 * Gửi OTP qua email
 * @param {string} email - Email nhận
 * @param {string} otp - Mã OTP
 * @param {string} userName - Tên người dùng
 */
const sendOTPEmail = async (email, otp, userName = 'Admin') => {
  const mailOptions = {
    from: `"NyNA House Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Mã xác thực đăng nhập Admin',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
            margin: 0;
          }
          .content {
            padding: 30px 0;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .otp-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 10px;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .warning-title {
            font-weight: bold;
            color: #856404;
            margin-bottom: 5px;
          }
          .warning-text {
            color: #856404;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            color: #666;
            font-size: 14px;
          }
          .info-list {
            list-style: none;
            padding: 0;
          }
          .info-list li {
            padding: 8px 0;
            font-size: 14px;
          }
          .info-list li:before {
            content: "✓ ";
            color: #4CAF50;
            font-weight: bold;
            margin-right: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">🏠 NyNA House Store</h1>
          </div>
          
          <div class="content">
            <div class="greeting">
              Xin chào <strong>${userName}</strong>,
            </div>
            
            <p>Bạn đã yêu cầu đăng nhập vào hệ thống Admin. Đây là mã xác thực của bạn:</p>
            
            <div class="otp-box">
              <div class="otp-label">MÃ XÁC THỰC</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <ul class="info-list">
              <li>Mã này có hiệu lực trong <strong>5 phút</strong></li>
              <li>Chỉ sử dụng một lần</li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
            </ul>
            
            <div class="warning">
              <div class="warning-title">⚠️ LƯU Ý BẢO MẬT</div>
              <div class="warning-text">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này và 
                <strong>đổi mật khẩu ngay lập tức</strong> để bảo vệ tài khoản.
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            <p style="margin-top: 10px;">
              © ${new Date().getFullYear()} NyNA House Store. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log('📧 Sending OTP email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Không thể gửi email. Vui lòng thử lại.');
  }
};

/**
 * Verify email configuration
 */
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  verifyEmailConfig
};