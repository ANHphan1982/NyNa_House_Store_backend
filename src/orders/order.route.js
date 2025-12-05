// backend/src/orders/order.route.js
const express = require('express');
const router = express.Router();

const { verifyToken, verifyAdminToken } = require('../middleware/verifyAdminToken');
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
// 🔥 CRITICAL: SPECIFIC ROUTES FIRST!
// =====================================

// Create order
router.post('/', verifyToken, createOrder);

// Get user's orders - MUST be before /:id
router.get('/my-orders', verifyToken, getUserOrders);
router.get('/user', verifyToken, getUserOrders); // 🔥 ADD: Support /user endpoint

// Cancel order - MUST be before /:id
router.post('/:id/cancel', verifyToken, cancelOrder);

// Admin routes - MUST be before /:id
router.get('/admin/all', verifyAdminToken, getAllOrders);
router.patch('/admin/:id/status', verifyAdminToken, updateOrderStatus);

// =====================================
// 🔥 GENERIC /:id ROUTE LAST!
// =====================================
router.get('/:id', verifyToken, getOrderById);

module.exports = router;