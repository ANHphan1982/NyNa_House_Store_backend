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
// ADMIN ROUTES (Must be FIRST!)
// =====================================

// 🔥 NEW: GET /api/orders?page=1&limit=20 (Admin get all)
router.get('/', verifyAdminToken, getAllOrders);

// Alternative admin endpoint (backward compatible)
router.get('/admin/all', verifyAdminToken, getAllOrders);

// Update order status
router.patch('/admin/:id/status', verifyAdminToken, updateOrderStatus);

// =====================================
// USER ROUTES (Specific before generic)
// =====================================

// Create order
router.post('/', verifyToken, createOrder);

// Get user's orders
router.get('/my-orders', verifyToken, getUserOrders);
router.get('/user', verifyToken, getUserOrders);

// Cancel order
router.post('/:id/cancel', verifyToken, cancelOrder);

// =====================================
// GENERIC ROUTES (LAST!)
// =====================================

// Get order by ID
router.get('/:id', verifyToken, getOrderById);

module.exports = router;