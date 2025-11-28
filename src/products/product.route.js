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

// Public routes
router.get('/', getAllProducts);                      // GET /api/products
router.get('/:id', getProductById);                   // GET /api/products/:id
router.get('/:id/related', getRelatedProducts);       // GET /api/products/:id/related

// Admin routes - CẦN TOKEN
router.post('/', verifyAdminToken, createProduct);    // POST /api/products
router.put('/:id', verifyAdminToken, updateProduct);  // PUT /api/products/:id
router.delete('/:id', verifyAdminToken, deleteProduct); // DELETE /api/products/:id

module.exports = router;