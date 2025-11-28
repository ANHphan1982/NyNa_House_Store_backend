// backend/src/orders/order.route.js
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} = require('./order.controller');
const { verifyToken, verifyAdminToken } = require('../middleware/verifyAdminToken');

console.log('✅ Order routes loaded');

// 🔥 IMPORTANT: Thứ tự routes rất quan trọng - Routes cụ thể phải đứng TRƯỚC routes động

// User routes
router.post('/', verifyToken, createOrder);
router.get('/user', verifyToken, getUserOrders);  // 🔥 PHẢI ĐỨG TRƯỚC /:id
router.patch('/:id/cancel', verifyToken, cancelOrder);

// Admin routes  
router.get('/', verifyAdminToken, getAllOrders);  // 🔥 PHẢI ĐỨNG TRƯỚC /:id
router.patch('/:id/status', verifyAdminToken, updateOrderStatus);

// 🔥 GET BY ID - Middleware linh hoạt cho phép cả user và admin
router.get('/:id', verifyTokenFlexible, getOrderById);

module.exports = router;

// 🔥 THÊM MIDDLEWARE LINH HOẠT
function verifyTokenFlexible(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Không tìm thấy token xác thực' 
    });
  }

  const jwt = require('jsonwebtoken');

  // Try JWT_ADMIN_SECRET first (cho admin)
  jwt.verify(token, process.env.JWT_ADMIN_SECRET, (err, decoded) => {
    if (!err) {
      console.log('✅ Verified with JWT_ADMIN_SECRET (Admin)');
      req.userId = decoded.userId;
      req.role = decoded.role;
      return next();
    }

    // Try JWT_SECRET (cho user)
    jwt.verify(token, process.env.JWT_SECRET, (err2, decoded2) => {
      if (err2) {
        console.log('❌ Token verification failed:', err2.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Token không hợp lệ hoặc đã hết hạn' 
        });
      }

      console.log('✅ Verified with JWT_SECRET (User)');
      req.userId = decoded2.userId;
      req.role = decoded2.role;
      next();
    });
  });
}