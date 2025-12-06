// backend/src/orders/order.route.js
const express = require('express');
const router = express.Router();

const { 
  verifyToken, 
  verifyAdminToken,
  verifyTokenOrAdmin
} = require('../middleware/verifyAdminToken');

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

// Get all orders (Admin only)
router.get('/', verifyAdminToken, getAllOrders);

// Alternative admin endpoint
router.get('/admin/all', verifyAdminToken, getAllOrders);

// Update order status - Both routes supported
router.patch('/:id/status', verifyAdminToken, updateOrderStatus); // 🔥 NEW: Without /admin
router.patch('/admin/:id/status', verifyAdminToken, updateOrderStatus); // Keep old route

// =====================================
// USER ROUTES (Specific before generic)
// =====================================

// Create order
router.post('/', verifyToken, createOrder);

// Get user's orders
router.get('/my-orders', verifyToken, getUserOrders);
router.get('/user', verifyToken, getUserOrders);

// Cancel order (User or Admin)
router.post('/:id/cancel', verifyTokenOrAdmin, cancelOrder);
router.patch('/:id/cancel', verifyTokenOrAdmin, cancelOrder); // 🔥 ADD THIS LINE

// =====================================
// GENERIC ROUTES (LAST!)
// =====================================

// Get order by ID (User or Admin)
router.get('/:id', verifyTokenOrAdmin, getOrderById);

module.exports = router;