// create-admin.js
const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  registerType: String,
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import bcrypt trong function
    const bcrypt = require('bcryptjs');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin đã tồn tại!');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin
    const admin = new User({
      name: 'Administrator',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      registerType: 'email',
      isActive: true
    });

    await admin.save();
    
    console.log('✅ Tạo admin thành công!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('\n⚠️  Hãy đổi mật khẩu sau khi đăng nhập lần đầu!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

createAdmin();