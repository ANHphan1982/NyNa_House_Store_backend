// backend/src/orders/order.route.js
const express = require('express');
const router = express.Router();

// 🔒 IMPORT MIDDLEWARE
const { verifyToken, verifyAdminToken } = require('../middleware/verifyAdminToken');

// 🔒 IMPORT CONTROLLER
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
// USER ROUTES
// =====================================

// Create order (authenticated users)
router.post('/', verifyToken, createOrder);

// Get user's orders
router.get('/my-orders', verifyToken, getUserOrders);

// Get order by ID
router.get('/:id', verifyToken, getOrderById);

// Cancel order
router.post('/:id/cancel', verifyToken, cancelOrder);

// =====================================
// ADMIN ROUTES
// =====================================

// Get all orders (admin)
router.get('/admin/all', verifyAdminToken, getAllOrders);

// Update order status (admin)
router.patch('/admin/:id/status', verifyAdminToken, updateOrderStatus);

module.exports = router;
