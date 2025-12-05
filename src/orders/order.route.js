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
// USER ROUTES (specific routes FIRST)
// =====================================

// 🔥 IMPORTANT: Specific routes BEFORE generic /:id
router.post('/', verifyToken, createOrder);
router.get('/my-orders', verifyToken, getUserOrders);  // ← BEFORE /:id
router.post('/:id/cancel', verifyToken, cancelOrder);  // ← BEFORE /:id
router.get('/:id', verifyToken, getOrderById);          // ← AFTER specific routes

// =====================================
// ADMIN ROUTES
// =====================================
router.get('/admin/all', verifyAdminToken, getAllOrders);
router.patch('/admin/:id/status', verifyAdminToken, updateOrderStatus);

module.exports = router;