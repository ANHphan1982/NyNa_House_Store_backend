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

console.log('✅ Product routes loaded');

// ⚠️ CRITICAL: Routes phải theo thứ tự từ cụ thể → chung

// 1. Public routes - SPECIFIC FIRST
router.get('/', getAllProducts);                          // GET /api/products
router.get('/:id/related', getRelatedProducts);           // GET /api/products/:id/related (PHẢI TRƯỚC /:id)

// 2. Admin routes - SPECIFIC PATHS
router.post('/', verifyAdminToken, createProduct);        // POST /api/products
router.put('/:id', verifyAdminToken, updateProduct);      // PUT /api/products/:id
router.delete('/:id', verifyAdminToken, deleteProduct);   // DELETE /api/products/:id

// 3. Generic route - MUST BE LAST
router.get('/:id', getProductById);                       // GET /api/products/:id (PHẢI Ở CUỐI)

module.exports = router;