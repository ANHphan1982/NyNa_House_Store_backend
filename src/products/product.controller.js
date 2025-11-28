// backend/src/products/product.controller.js
const Product = require('./product.model');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      sort = 'createdAt', 
      order = 'desc',
      page = 1,
      limit = 100 // 🔥 Tăng limit để lấy nhiều products
    } = req.query;

    let query = { isActive: true };

    if (category && category !== 'Tất cả') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sort]: sortOrder };

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    console.log(`📦 Found ${products.length} products`);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
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

// Get single product
const getProductById = async (req, res) => {
  try {
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(req.params.id)) {
      product = await Product.findOne({ productId: parseInt(req.params.id) });
    } else {
      product = await Product.findById(req.params.id);
    }

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

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

// Create product (Admin)
const createProduct = async (req, res) => {
  try {
    console.log('📦 Creating product:', req.body);

    // Kiểm tra productId đã tồn tại chưa
    if (req.body.productId) {
      const existingProduct = await Product.findOne({ 
        productId: req.body.productId 
      });
      
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product ID đã tồn tại'
        });
      }
    }

    const newProduct = new Product(req.body);
    await newProduct.save();

    console.log('✅ Product created:', newProduct._id);

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      product: newProduct
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thêm sản phẩm: ' + error.message
    });
  }
};

// Update product (Admin)
const updateProduct = async (req, res) => {
  try {
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(req.params.id)) {
      product = await Product.findOneAndUpdate(
        { productId: parseInt(req.params.id) },
        req.body,
        { new: true, runValidators: true }
      );
    } else {
      product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
    }

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

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
};

// Delete product (Admin)
const deleteProduct = async (req, res) => {
  try {
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(req.params.id)) {
      product = await Product.findOneAndDelete({ 
        productId: parseInt(req.params.id) 
      });
    } else {
      product = await Product.findByIdAndDelete(req.params.id);
    }

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm' 
      });
    }

    console.log('✅ Product deleted:', product._id);

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
};

// Get related products
const getRelatedProducts = async (req, res) => {
  try {
    let product = null;
    
    if (!isNaN(req.params.id)) {
      product = await Product.findOne({ productId: parseInt(req.params.id) });
    } else {
      product = await Product.findById(req.params.id);
    }
    
    if (!product) {
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

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts
};