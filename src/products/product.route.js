// backend/src/products/product.route.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('./product.model');
const { verifyAdminToken } = require('../middleware/verifyAdminToken');

console.log('✅ Product routes loaded');

// =====================================
// PUBLIC ROUTES
// =====================================

// 🔥 GET ALL PRODUCTS (with pagination, filtering, sorting)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-__v');

    const total = await Product.countDocuments(filter);

    console.log(`📦 Found ${products.length} products (Total: ${total})`);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm'
    });
  }
});

// 🔥 GET CATEGORIES (MUST BE BEFORE /:id to avoid conflict)
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });

    res.json({
      success: true,
      categories: categories.filter(Boolean) // Remove null/undefined
    });

  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục'
    });
  }
});

// 🔥 NEW: GET RELATED PRODUCTS (MUST BE BEFORE /:id)
router.get('/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Number(req.query.limit) || 4;

    console.log('🔗 Fetching related products for:', id);

    // First, find the current product to get its category
    let currentProduct;
    
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      currentProduct = await Product.findOne({ _id: id, isActive: true });
    } else if (!isNaN(id)) {
      currentProduct = await Product.findOne({ productId: Number(id), isActive: true });
    }

    if (!currentProduct) {
      console.log('❌ Current product not found');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Find related products (same category, exclude current product)
    const relatedProducts = await Product.find({
      category: currentProduct.category,
      _id: { $ne: currentProduct._id }, // Exclude current product
      isActive: true
    })
      .limit(limit)
      .select('-__v')
      .sort('-createdAt');

    console.log(`✅ Found ${relatedProducts.length} related products`);

    res.json({
      success: true,
      products: relatedProducts,
      total: relatedProducts.length
    });

  } catch (error) {
    console.error('❌ Get related products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy sản phẩm liên quan'
    });
  }
});

// 🔥 GET SINGLE PRODUCT (MUST BE AFTER specific routes like /:id/related)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    console.log('🔍 Looking for product:', id);

    // 🔥 TRY 1: Check if it's a valid ObjectId (24 hex chars)
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      console.log('   → Querying by _id (ObjectId)');
      product = await Product.findOne({ _id: id, isActive: true });
    }

    // 🔥 TRY 2: If not found, try productId (Number)
    if (!product && !isNaN(id)) {
      console.log('   → Querying by productId (Number)');
      product = await Product.findOne({ productId: Number(id), isActive: true });
    }

    // 🔥 TRY 3: If still not found, try by name
    if (!product) {
      console.log('   → Querying by name');
      product = await Product.findOne({
        name: { $regex: new RegExp(id, 'i') },
        isActive: true
      });
    }

    if (!product) {
      console.log('❌ Product not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    console.log('✅ Found product:', product.name);

    res.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('❌ Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin sản phẩm'
    });
  }
});

// =====================================
// ADMIN ROUTES
// =====================================

// 🔥 CREATE PRODUCT
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const productData = req.body;

    console.log('📝 Creating product:', productData.name);

    // Validate required fields
    if (!productData.name || !productData.price) {
      return res.status(400).json({
        success: false,
        message: 'Tên và giá sản phẩm là bắt buộc'
      });
    }

    // Generate productId if not provided
    if (!productData.productId) {
      productData.productId = Date.now();
    }

    const product = new Product(productData);
    await product.save();

    console.log('✅ Product created:', product._id);

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      product
    });

  } catch (error) {
    console.error('❌ Create product error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm đã tồn tại (trùng productId hoặc tên)'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm'
    });
  }
});

// 🔥 UPDATE PRODUCT
router.patch('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('📝 Updating product:', id);

    // Find product by _id or productId
    let product;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      product = await Product.findById(id);
    } else if (!isNaN(id)) {
      product = await Product.findOne({ productId: Number(id) });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'productId') {
        product[key] = updates[key];
      }
    });

    await product.save();

    console.log('✅ Product updated:', product._id);

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      product
    });

  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm'
    });
  }
});

// 🔥 DELETE PRODUCT (Soft delete)
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting product:', id);

    // Find product by _id or productId
    let product;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      product = await Product.findById(id);
    } else if (!isNaN(id)) {
      product = await Product.findOne({ productId: Number(id) });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    console.log('✅ Product deleted (soft):', product._id);

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });

  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm'
    });
  }
});

module.exports = router;