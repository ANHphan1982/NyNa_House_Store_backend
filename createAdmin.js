// createAdmin.js (VERSION CẬP NHẬT)
const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  registerType: String,
  isActive: Boolean,
  loginAttempts: Number,
  lockUntil: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createOrResetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const bcrypt = require('bcryptjs');
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin@123456'; // Password mới (mạnh hơn)
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Admin đã tồn tại!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Role:', existingAdmin.role);
      console.log('\n🔄 Đang reset password...\n');
      
      // Hash new password với salt 12 (cao hơn, an toàn hơn)
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      // Update password và reset login attempts
      await User.updateOne(
        { email: adminEmail },
        { 
          $set: { 
            password: hashedPassword,
            loginAttempts: 0,
            isActive: true
          },
          $unset: { lockUntil: 1 }
        }
      );
      
      console.log('✅ Password đã được reset!');
      console.log('═══════════════════════════════════');
      console.log('📧 Email:    admin@example.com');
      console.log('🔑 Password: Admin@123456');
      console.log('═══════════════════════════════════');
      console.log('\n⚠️  ĐỔI MẬT KHẨU SAU KHI ĐĂNG NHẬP LẦN ĐẦU!\n');
      
    } else {
      console.log('📝 Tạo admin mới...\n');
      
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      // Create admin
      const admin = new User({
        name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        registerType: 'email',
        isActive: true,
        loginAttempts: 0
      });

      await admin.save();
      
      console.log('✅ Tạo admin thành công!');
      console.log('═══════════════════════════════════');
      console.log('📧 Email:    admin@example.com');
      console.log('🔑 Password: Admin@123456');
      console.log('═══════════════════════════════════');
      console.log('\n⚠️  ĐỔI MẬT KHẨU SAU KHI ĐĂNG NHẬP LẦN ĐẦU!\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

createOrResetAdmin();