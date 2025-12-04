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

// 🔒 IMPORT SECURITY
const { orderLimiter } = require('../config/security');

console.log('✅ Order routes loaded with security');

// =====================================
// IMPORTANT: Route order matters
// Specific routes BEFORE dynamic routes
// =====================================

// 🔒 USER ROUTES with rate limiting
router.post('/', verifyToken, orderLimiter, createOrder);          // Create order (max 10/hour)
router.get('/user', verifyToken, getUserOrders);                   // Get user's orders
router.patch('/:id/cancel', verifyToken, cancelOrder);             // Cancel order

// 🔒 ADMIN ROUTES
router.get('/', verifyAdminToken, getAllOrders);                   // Get all orders (admin only)
router.patch('/:id/status', verifyAdminToken, updateOrderStatus);  // Update status (admin only)

// 🔒 GET BY ID - Flexible middleware (user or admin)
router.get('/:id', verifyTokenFlexible, getOrderById);

module.exports = router;

// =====================================
// 🔒 FLEXIBLE TOKEN VERIFICATION
// Allows both user and admin tokens
// =====================================
function verifyTokenFlexible(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Không tìm thấy token xác thực' 
    });
  }

  const jwt = require('jsonwebtoken');

  // Try JWT_ADMIN_SECRET first (for admin)
  jwt.verify(token, process.env.JWT_ADMIN_SECRET, (err, decoded) => {
    if (!err) {
      console.log('✅ Verified with JWT_ADMIN_SECRET (Admin)');
      req.userId = decoded.userId;
      req.role = decoded.role || 'admin';
      return next();
    }

    // Try JWT_SECRET (for user)
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
      req.role = decoded2.role || 'user';
      next();
    });
  });
}