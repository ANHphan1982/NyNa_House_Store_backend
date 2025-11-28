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
      limit = 100
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

    console.log(`📦 Found ${products.length} products (Total: ${total})`);

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
    console.log('🔍 Getting product by ID:', req.params.id);
    
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(req.params.id)) {
      console.log('  → Searching by productId (number)');
      product = await Product.findOne({ productId: parseInt(req.params.id) });
    } else {
      console.log('  → Searching by _id (ObjectId)');
      product = await Product.findById(req.params.id);
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

// Create product (Admin)
const createProduct = async (req, res) => {
  try {
    console.log('📦 Creating product:', req.body.name);
    console.log('👤 Admin ID:', req.userId);

    // Kiểm tra productId đã tồn tại chưa
    if (req.body.productId) {
      const existingProduct = await Product.findOne({ 
        productId: req.body.productId 
      });
      
      if (existingProduct) {
        console.log('❌ Product ID already exists:', req.body.productId);
        return res.status(400).json({
          success: false,
          message: 'Product ID đã tồn tại'
        });
      }
    }

    const newProduct = new Product(req.body);
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
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thêm sản phẩm: ' + error.message
    });
  }
};

// Update product (Admin)
const updateProduct = async (req, res) => {
  try {
    console.log('📝 Updating product:', req.params.id);
    console.log('👤 Admin ID:', req.userId);
    console.log('📋 Update data:', req.body);
    
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(req.params.id)) {
      console.log('  → Updating by productId (number)');
      product = await Product.findOneAndUpdate(
        { productId: parseInt(req.params.id) },
        req.body,
        { new: true, runValidators: true }
      );
    } else {
      console.log('  → Updating by _id (ObjectId)');
      product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
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
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật sản phẩm' 
    });
  }
};

// Delete product (Admin)
const deleteProduct = async (req, res) => {
  try {
    console.log('🗑️  DELETE Request received');
    console.log('📋 Product ID:', req.params.id);
    console.log('👤 Admin ID:', req.userId, '| Role:', req.role);
    
    let product = null;
    
    // Tìm theo productId hoặc _id
    if (!isNaN(req.params.id)) {
      console.log('🔍 Searching by productId (number):', parseInt(req.params.id));
      
      // First check if exists
      const checkProduct = await Product.findOne({ productId: parseInt(req.params.id) });
      console.log('  → Product exists before delete:', !!checkProduct);
      
      product = await Product.findOneAndDelete({ 
        productId: parseInt(req.params.id) 
      });
    } else {
      console.log('🔍 Searching by _id (ObjectId):', req.params.id);
      
      // First check if exists
      const checkProduct = await Product.findById(req.params.id);
      console.log('  → Product exists before delete:', !!checkProduct);
      
      product = await Product.findByIdAndDelete(req.params.id);
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
      message: 'Lỗi khi xóa sản phẩm: ' + error.message
    });
  }
};

// Get related products
const getRelatedProducts = async (req, res) => {
  try {
    console.log('🔗 Getting related products for:', req.params.id);
    
    let product = null;
    
    if (!isNaN(req.params.id)) {
      product = await Product.findOne({ productId: parseInt(req.params.id) });
    } else {
      product = await Product.findById(req.params.id);
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

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts
};