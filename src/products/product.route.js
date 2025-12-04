// backend/src/products/product.route.js
const express = require('express');
const router = express.Router();

console.log('🔍 [DEBUG] Starting product.route.js');

// 🔥 DEBUG: Import controllers
console.log('🔍 [DEBUG] Importing product.controller...');
const controller = require('./product.controller');
console.log('🔍 [DEBUG] Controller imported:', typeof controller);
console.log('🔍 [DEBUG] Controller keys:', Object.keys(controller));

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts
} = controller;

console.log('🔍 [DEBUG] Functions after destructure:');
console.log('  - getAllProducts:', typeof getAllProducts);
console.log('  - getProductById:', typeof getProductById);
console.log('  - createProduct:', typeof createProduct);
console.log('  - updateProduct:', typeof updateProduct);
console.log('  - deleteProduct:', typeof deleteProduct);
console.log('  - getRelatedProducts:', typeof getRelatedProducts);

// 🔥 DEBUG: Import middleware
console.log('🔍 [DEBUG] Importing verifyAdminToken...');
const { verifyAdminToken } = require('../middleware/verifyAdminToken');
console.log('🔍 [DEBUG] verifyAdminToken:', typeof verifyAdminToken);

// 🔒 DEBUG: Import security
console.log('🔍 [DEBUG] Importing security config...');
const securityConfig = require('../config/security');
console.log('🔍 [DEBUG] Security config:', typeof securityConfig);
console.log('🔍 [DEBUG] Security keys:', Object.keys(securityConfig));

const { generalLimiter } = securityConfig;
console.log('🔍 [DEBUG] generalLimiter:', typeof generalLimiter);

console.log('✅ Product routes loaded with security');

// =====================================
// ROUTES WITH DEBUG
// =====================================

console.log('🔍 [DEBUG] Setting up routes...');

// Route 1
console.log('🔍 [DEBUG] Route 1: GET /');
console.log('  - generalLimiter:', typeof generalLimiter);
console.log('  - getAllProducts:', typeof getAllProducts);
router.get('/', generalLimiter, getAllProducts);
console.log('✅ [DEBUG] Route 1 OK');

// Route 2
console.log('🔍 [DEBUG] Route 2: GET /:id/related');
console.log('  - generalLimiter:', typeof generalLimiter);
console.log('  - getRelatedProducts:', typeof getRelatedProducts);
router.get('/:id/related', generalLimiter, getRelatedProducts);
console.log('✅ [DEBUG] Route 2 OK');

// Route 3
console.log('🔍 [DEBUG] Route 3: POST /');
console.log('  - verifyAdminToken:', typeof verifyAdminToken);
console.log('  - createProduct:', typeof createProduct);
router.post('/', verifyAdminToken, createProduct);
console.log('✅ [DEBUG] Route 3 OK');

// Route 4
console.log('🔍 [DEBUG] Route 4: PUT /:id');
console.log('  - verifyAdminToken:', typeof verifyAdminToken);
console.log('  - updateProduct:', typeof updateProduct);
router.put('/:id', verifyAdminToken, updateProduct);
console.log('✅ [DEBUG] Route 4 OK');

// Route 5
console.log('🔍 [DEBUG] Route 5: DELETE /:id');
console.log('  - verifyAdminToken:', typeof verifyAdminToken);
console.log('  - deleteProduct:', typeof deleteProduct);
router.delete('/:id', verifyAdminToken, deleteProduct);
console.log('✅ [DEBUG] Route 5 OK');

// Route 6 - LINE 29 (THE PROBLEM)
console.log('🔍 [DEBUG] Route 6: GET /:id (LINE 29)');
console.log('  - generalLimiter:', typeof generalLimiter);
console.log('  - getProductById:', typeof getProductById);

if (typeof generalLimiter !== 'function') {
  console.error('❌ [ERROR] generalLimiter is NOT a function!');
  console.error('   Type:', typeof generalLimiter);
  console.error('   Value:', generalLimiter);
}

if (typeof getProductById !== 'function') {
  console.error('❌ [ERROR] getProductById is NOT a function!');
  console.error('   Type:', typeof getProductById);
  console.error('   Value:', getProductById);
}

router.get('/:id', generalLimiter, getProductById);
console.log('✅ [DEBUG] Route 6 OK');

console.log('✅ [DEBUG] All routes configured successfully');

module.exports = router;