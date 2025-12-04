// backend/src/products/product.route.js
const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts
} = require('./product.controller');
const { verifyAdminToken } = require('../middleware/verifyAdminToken');

// 🔒 IMPORT SECURITY
const { generalLimiter } = require('../config/security');

console.log('✅ Product routes loaded with security');

// =====================================
// CRITICAL: Route order matters
// Specific routes BEFORE dynamic routes
// =====================================

// 🔒 PUBLIC ROUTES (with rate limiting)
router.get('/', generalLimiter, getAllProducts);                    // GET /api/products
router.get('/:id/related', generalLimiter, getRelatedProducts);     // GET /api/products/:id/related

// 🔒 ADMIN ROUTES (admin only)
router.post('/', verifyAdminToken, createProduct);                  // POST /api/products
router.put('/:id', verifyAdminToken, updateProduct);                // PUT /api/products/:id
router.delete('/:id', verifyAdminToken, deleteProduct);             // DELETE /api/products/:id

// 🔒 GENERIC ROUTE (MUST BE LAST)
router.get('/:id', generalLimiter, getProductById);                 // GET /api/products/:id

module.exports = router;