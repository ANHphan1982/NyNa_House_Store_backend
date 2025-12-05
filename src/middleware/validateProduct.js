// backend/src/middleware/validateProduct.js
const mongoose = require('mongoose');
const Product = require('../products/product.model');

/**
 * 🔍 VALIDATE AND NORMALIZE PRODUCT IDS
 * Accept both productId (Number) and _id (ObjectId)
 */
const validateProducts = async (req, res, next) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
    }

    // 🔥 VALIDATE AND NORMALIZE each product
    const validatedProducts = [];

    for (const item of products) {
      let product;

      // Try to find product by productId (Number) or _id (ObjectId)
      if (item.productId) {
        // Check if it's a number
        if (!isNaN(item.productId)) {
          product = await Product.findOne({ 
            productId: Number(item.productId),
            isActive: true 
          });
        }
        
        // Check if it's ObjectId
        if (!product && mongoose.Types.ObjectId.isValid(item.productId)) {
          product = await Product.findOne({
            _id: item.productId,
            isActive: true
          });
        }
      }

      // Product not found
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm không tồn tại hoặc đã bị xóa`,
          invalidProductId: item.productId
        });
      }

      // Validate quantity
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng không hợp lệ',
          product: product.name
        });
      }

      // Check stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm`,
          availableStock: product.stock
        });
      }

      // Add validated product
      validatedProducts.push({
        product: product,
        quantity: item.quantity,
        size: item.size || 'M',
        price: product.price
      });
    }

    // Attach validated products to request
    req.validatedProducts = validatedProducts;
    
    next();

  } catch (error) {
    console.error('❌ Product validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực sản phẩm'
    });
  }
};

module.exports = { validateProducts };