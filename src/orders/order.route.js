// backend/src/orders/order.route.js
const express = require('express');
const router = express.Router();

const { verifyToken, verifyAdminToken, verifyTokenOrAdmin } = require('../middleware/verifyAdminToken');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} = require('./order.controller');

console.log('✅ Order routes loaded');

// =====================================
// ADMIN ROUTES (First)
// =====================================
router.get('/', verifyAdminToken, getAllOrders);
router.get('/admin/all', verifyAdminToken, getAllOrders);
router.patch('/admin/:id/status', verifyAdminToken, updateOrderStatus);
router.patch('/:id/status', verifyAdminToken, updateOrderStatus);

// =====================================
// USER ROUTES
// =====================================
router.get('/my-orders', verifyToken, getUserOrders);
router.get('/user', verifyToken, getUserOrders);

// 🔥 NEW: Guest order lookup by phone
router.post('/guest/lookup', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại là bắt buộc'
      });
    }
    
    const Order = require('./order.model');
    const orders = await Order.find({
      'guestInfo.phone': phone,
      orderType: 'guest'
    }).sort('-createdAt').limit(10);
    
    res.json({
      success: true,
      orders
    });
    
  } catch (error) {
    console.error('❌ Guest lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tra cứu đơn hàng'
    });
  }
});

// =====================================
// 🔥 CREATE ORDER - Support both User & Guest
// =====================================
router.post('/', async (req, res) => {
  // 🔥 Try to verify token, but don't require it
  let userId = null;
  const token = req.cookies?.userToken || req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
      console.log('✅ User order (logged in):', userId);
    } catch (err) {
      // Token invalid, treat as guest
      console.log('🔓 Guest order (no valid token)');
    }
  } else {
    console.log('🔓 Guest order (no token)');
  }
  
  // Add userId to request if found
  if (userId) {
    req.userId = userId;
  }
  
  // Call createOrder with optional userId
  return createOrder(req, res);
});

// Cancel order
router.post('/:id/cancel', verifyTokenOrAdmin, cancelOrder);
router.patch('/:id/cancel', verifyTokenOrAdmin, cancelOrder); // 🔥 ADD THIS LINE

// =====================================
// GENERIC ROUTES (Last)
// =====================================
router.get('/:id', verifyTokenOrAdmin, getOrderById);

module.exports = router;