// backend/src/products/product.controller.js
const Product = require('./product.model');
const {
  validateNumber,
  sanitizeString,
  sanitizeObject
} = require('../utils/validation');

// Get all products (Public)
const getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      sort = 'createdAt', 
      order = 'desc',
      page = 1,
      limit = 100
    } = req.query;

    // 🔒 Validate pagination
    const validatedPage = Math.max(parseInt(page) || 1, 1);
    const validatedLimit = Math.min(parseInt(limit) || 100, 100); // Max 100

    let query = { isActive: true };

    // 🔒 Sanitize search inputs
    if (category && category !== 'Tất cả') {
      query.category = sanitizeString(category, 50);
    }

    if (search) {
      const sanitizedSearch = sanitizeString(search, 100);
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    // 🔒 Validate sort field (whitelist)
    const allowedSortFields = ['createdAt', 'price', 'name', 'productId'];
    const validSort = allowedSortFields.includes(sort) ? sort : 'createdAt';
    
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [validSort]: sortOrder };

    const skip = (validatedPage - 1) * validatedLimit;
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(validatedLimit);

    const total = await Product.countDocuments(query);

    console.log(`📦 Found ${products.length} products (Total: ${total})`);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: validatedPage,
        pages: Math.ceil(total / validatedLimit)
      }
    });
  } catch (error) {
    console.error('❌ Get all products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách sản phẩm' 
    });
  }
};

// Get single product (Public)
const getProductById = async (req, res) => {
  try {
    const productId = sanitizeString(req.params.id, 50);
    console.log('🔍 Getting product by ID:', productId);
    
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(productId)) {
      console.log('  → Searching by productId (number)');
      const numericId = parseInt(productId);
      
      // 🔒 Validate number range
      if (numericId < 1 || numericId > 999999) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product ID không hợp lệ' 
        });
      }
      
      product = await Product.findOne({ productId: numericId });
    } else {
      console.log('  → Searching by _id (ObjectId)');
      
      // 🔒 Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID không hợp lệ' 
        });
      }
      
      product = await Product.findById(productId);
    }

    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

    console.log('✅ Product found:', product.name);

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
};

// Create product (Admin only)
const createProduct = async (req, res) => {
  try {
    console.log('📦 Creating product:', req.body.name);
    console.log('👤 Admin ID:', req.userId);

    // 🔒 Sanitize input
    const sanitizedData = sanitizeObject(req.body);
    
    // 🔒 Validate required fields
    if (!sanitizedData.name || sanitizedData.name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Tên sản phẩm phải có ít nhất 2 ký tự'
      });
    }

    // 🔒 Validate price
    if (sanitizedData.price !== undefined) {
      const priceValidation = validateNumber(sanitizedData.price, {
        min: 0,
        max: 999999999,
        allowDecimal: true
      });
      
      if (!priceValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Giá sản phẩm không hợp lệ'
        });
      }
    }

    // Kiểm tra productId đã tồn tại chưa
    if (sanitizedData.productId) {
      const existingProduct = await Product.findOne({ 
        productId: sanitizedData.productId 
      });
      
      if (existingProduct) {
        console.log('❌ Product ID already exists:', sanitizedData.productId);
        return res.status(400).json({
          success: false,
          message: 'Product ID đã tồn tại'
        });
      }
    }

    const newProduct = new Product(sanitizedData);
    await newProduct.save();

    console.log('✅ Product created successfully');
    console.log('   _id:', newProduct._id);
    console.log('   productId:', newProduct.productId);
    console.log('   name:', newProduct.name);

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      product: newProduct
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thêm sản phẩm'
    });
  }
};

// Update product (Admin only)
const updateProduct = async (req, res) => {
  try {
    const productId = sanitizeString(req.params.id, 50);
    console.log('🔍 Updating product:', productId);
    console.log('👤 Admin ID:', req.userId);
    
    // 🔒 Sanitize update data
    const sanitizedData = sanitizeObject(req.body);
    console.log('📋 Sanitized update data:', sanitizedData);
    
    // 🔒 Validate price if provided
    if (sanitizedData.price !== undefined) {
      const priceValidation = validateNumber(sanitizedData.price, {
        min: 0,
        max: 999999999,
        allowDecimal: true
      });
      
      if (!priceValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Giá sản phẩm không hợp lệ'
        });
      }
    }
    
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(productId)) {
      console.log('  → Updating by productId (number)');
      product = await Product.findOneAndUpdate(
        { productId: parseInt(productId) },
        sanitizedData,
        { new: true, runValidators: true }
      );
    } else {
      console.log('  → Updating by _id (ObjectId)');
      
      // 🔒 Validate ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID không hợp lệ' 
        });
      }
      
      product = await Product.findByIdAndUpdate(
        productId,
        sanitizedData,
        { new: true, runValidators: true }
      );
    }

    if (!product) {
      console.log('❌ Product not found for update');
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

    console.log('✅ Product updated successfully:', product.name);

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      product
    });
  } catch (error) {
    console.error('❌ Update product error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật sản phẩm' 
    });
  }
};

// Delete product (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const productId = sanitizeString(req.params.id, 50);
    console.log('🗑️ DELETE Request received');
    console.log('📋 Product ID:', productId);
    console.log('👤 Admin ID:', req.userId, '| Role:', req.role);
    
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(productId)) {
      console.log('🔍 Searching by productId (number):', parseInt(productId));
      
      // 🔒 Validate number
      const numericId = parseInt(productId);
      if (numericId < 1 || numericId > 999999) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product ID không hợp lệ' 
        });
      }
      
      // First check if exists
      const checkProduct = await Product.findOne({ productId: numericId });
      console.log('  → Product exists before delete:', !!checkProduct);
      
      product = await Product.findOneAndDelete({ 
        productId: numericId 
      });
    } else {
      console.log('🔍 Searching by _id (ObjectId):', productId);
      
      // 🔒 Validate ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID không hợp lệ' 
        });
      }
      
      // First check if exists
      const checkProduct = await Product.findById(productId);
      console.log('  → Product exists before delete:', !!checkProduct);
      
      product = await Product.findByIdAndDelete(productId);
    }

    if (!product) {
      console.log('❌ Product not found in database');
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm để xóa' 
      });
    }

    console.log('✅ Product DELETED from MongoDB successfully!');
    console.log('   _id:', product._id);
    console.log('   productId:', product.productId);
    console.log('   name:', product.name);
    console.log('   category:', product.category);

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công',
      deletedProduct: {
        _id: product._id,
        productId: product.productId,
        name: product.name
      }
    });
  } catch (error) {
    console.error('❌ Delete product error:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xóa sản phẩm'
    });
  }
};

// Get related products (Public)
const getRelatedProducts = async (req, res) => {
  try {
    const productId = sanitizeString(req.params.id, 50);
    console.log('🔗 Getting related products for:', productId);
    
    let product = null;
    
    if (!isNaN(productId)) {
      const numericId = parseInt(productId);
      
      // 🔒 Validate number
      if (numericId < 1 || numericId > 999999) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product ID không hợp lệ' 
        });
      }
      
      product = await Product.findOne({ productId: numericId });
    } else {
      // 🔒 Validate ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID không hợp lệ' 
        });
      }
      
      product = await Product.findById(productId);
    }
    
    if (!product) {
      console.log('❌ Base product not found for related search');
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4);

    console.log(`✅ Found ${relatedProducts.length} related products in category: ${product.category}`);

    res.json({
      success: true,
      products: relatedProducts
    });
  } catch (error) {
    console.error('❌ Get related products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy sản phẩm liên quan' 
    });
  }
};

// 🔥 CRITICAL: Export all functions
module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts
};