// backend/src/orders/order.controller.js
const Order = require('./order.model');
const Product = require('../products/product.model');
const mongoose = require('mongoose');

// 🔒 IMPORT VALIDATION
const {
  validateOrderData,
  validateNumber,
  sanitizeString,
  sanitizeObject
} = require('../utils/validation');

// =====================================
// 1. CREATE ORDER
// =====================================
const createOrder = async (req, res) => {
  try {
    console.log('📦 Creating order for user:', req.userId);
    
    // 🔒 SANITIZE INPUT
    const sanitizedBody = sanitizeObject(req.body);
    
    const { 
      products,
      items,
      shippingAddress, 
      paymentMethod, 
      notes,
      note,
      subtotal,
      shippingFee, 
      totalAmount 
    } = sanitizedBody;

    // Accept both "products" and "items"
    const orderItems = products || items;

    // 🔒 VALIDATE ORDER DATA
    const validation = validateOrderData({
      products: orderItems,
      shippingAddress,
      paymentMethod
    });

    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0],
        errors: validation.errors
      });
    }

    console.log('✅ Order has', orderItems.length, 'items');

    // =====================================
    // STEP 1: VALIDATE & FIND PRODUCTS
    // =====================================
    const productChecks = [];
    const validatedItems = [];
    
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      
      console.log(`🔍 Processing item ${i}:`, {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity
      });
      
      // 🔒 VALIDATE quantity
      const quantityValidation = validateNumber(item.quantity, {
        min: 1,
        max: 9999,
        integer: true
      });
      
      if (!quantityValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Số lượng sản phẩm "${item.name}" không hợp lệ`
        });
      }

      // 🔥 FIX: FIND PRODUCT - Handle both ObjectId and Number
      let product = null;
      
      if (item.productId) {
        // Check if productId is ObjectId (24 character hex string)
        if (mongoose.Types.ObjectId.isValid(item.productId) && 
            typeof item.productId === 'string' && 
            item.productId.length === 24) {
          
          console.log(`   → Querying by _id (ObjectId): ${item.productId}`);
          product = await Product.findOne({ 
            _id: item.productId,
            isActive: true
          });
          
          if (product) {
            console.log(`   ✅ Found by _id: ${product.name}`);
          }
        } 
        // Check if productId is a number
        else if (!isNaN(item.productId)) {
          console.log(`   → Querying by productId (Number): ${item.productId}`);
          product = await Product.findOne({ 
            productId: Number(item.productId),
            isActive: true
          });
          
          if (product) {
            console.log(`   ✅ Found by productId: ${product.name}`);
          }
        }
      }
      
      // Fallback: Try finding by name
      if (!product && item.name) {
        console.log(`   → Fallback: Querying by name: ${item.name}`);
        product = await Product.findOne({ 
          name: item.name,
          isActive: true
        });
        
        if (product) {
          console.log(`   ✅ Found by name: ${product.name}`);
        }
      }

      if (!product) {
        console.log(`   ❌ Product not found:`, item);
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm: ${item.name || item.productId}`
        });
      }

      // Check stock
      if (product.stock !== undefined && product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho`
        });
      }

      productChecks.push({
        product: product,
        quantity: quantityValidation.value || item.quantity
      });

      validatedItems.push({
        productId: product._id, // 🔥 Always use _id (ObjectId) for order items
        name: sanitizeString(product.name),
        quantity: quantityValidation.value || item.quantity,
        price: item.price || product.price,
        size: item.selectedSize || item.size || null,
        image: product.image || item.image
      });
    }

    console.log('✅ All products validated');

    // =====================================
    // STEP 2: VALIDATE PAYMENT METHOD
    // =====================================
    const normalizedPaymentMethod = (paymentMethod || 'cod').toUpperCase();
    const validMethods = ['COD', 'BANK', 'CARD', 'MOMO', 'ZALOPAY'];
    
    if (!validMethods.includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    // =====================================
    // STEP 3: CALCULATE TOTALS
    // =====================================
    const calculatedSubtotal = subtotal || validatedItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    );
    const calculatedShippingFee = shippingFee !== undefined ? shippingFee : 30000;
    const calculatedTotal = totalAmount || (calculatedSubtotal + calculatedShippingFee);

    console.log('💰 Order totals:', {
      subtotal: calculatedSubtotal,
      shippingFee: calculatedShippingFee,
      total: calculatedTotal
    });

    // =====================================
    // STEP 4: CREATE ORDER
    // =====================================
    const newOrder = new Order({
      userId: req.userId,
      items: validatedItems,
      shippingAddress: {
        fullName: sanitizeString(shippingAddress.fullName, 100),
        phone: sanitizeString(shippingAddress.phone, 20),
        email: sanitizeString(shippingAddress.email || '', 255),
        address: sanitizeString(shippingAddress.address, 500),
        ward: sanitizeString(shippingAddress.ward || 'N/A', 100),
        district: sanitizeString(shippingAddress.district || 'N/A', 100),
        city: sanitizeString(shippingAddress.city || 'N/A', 100)
      },
      paymentMethod: normalizedPaymentMethod,
      note: sanitizeString(notes || note || '', 1000),
      subtotal: calculatedSubtotal,
      shippingFee: calculatedShippingFee,
      totalAmount: calculatedTotal
    });

    await newOrder.save();
    console.log('✅ Order saved:', newOrder._id);

    // =====================================
    // STEP 5: UPDATE STOCK
    // =====================================
    for (let check of productChecks) {
      if (check.product.stock !== undefined) {
        const oldStock = check.product.stock;
        
        await Product.findByIdAndUpdate(
          check.product._id,
          {
            $inc: { 
              stock: -check.quantity,
              soldCount: check.quantity
            }
          }
        );
        
        console.log(`📉 ${check.product.name}: ${oldStock} → ${oldStock - check.quantity}`);
      }
    }

    console.log('✅ Order created successfully:', newOrder._id);

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order: {
        _id: newOrder._id,
        orderNumber: newOrder._id.toString().slice(-8),
        totalAmount: newOrder.totalAmount,
        status: newOrder.status,
        createdAt: newOrder.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tạo đơn hàng: ' + error.message
    });
  }
};

// =====================================
// 2. GET USER ORDERS
// =====================================
const getUserOrders = async (req, res) => {
  try {
    console.log('🔍 Fetching orders for user:', req.userId);

    // 🔒 VALIDATE limit parameter
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    console.log('📦 Found orders:', orders.length);

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('❌ Get user orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách đơn hàng' 
    });
  }
};

// =====================================
// 3. GET ORDER BY ID
// =====================================
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đơn hàng' 
      });
    }

    // 🔒 CHECK AUTHORIZATION
    if (order.userId._id.toString() !== req.userId && req.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền xem đơn hàng này' 
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy thông tin đơn hàng' 
    });
  }
};

// =====================================
// 4. GET ALL ORDERS (ADMIN)
// =====================================
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status) {
      query.status = sanitizeString(status);
    }

    // 🔒 VALIDATE pagination
    const validatedPage = Math.max(parseInt(page) || 1, 1);
    const validatedLimit = Math.min(parseInt(limit) || 20, 100);

    const skip = (validatedPage - 1) * validatedLimit;
    
    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(validatedLimit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: validatedPage,
        pages: Math.ceil(total / validatedLimit)
      }
    });
  } catch (error) {
    console.error('❌ Get all orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách đơn hàng' 
    });
  }
};

// =====================================
// 5. UPDATE ORDER STATUS (ADMIN)
// =====================================
const updateOrderStatus = async (req, res) => {
  try {
    // 🔒 SANITIZE status
    const status = sanitizeString(req.body.status);
    
    const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đơn hàng' 
      });
    }

    order.status = status;

    if (status === 'delivered') {
      order.deliveredAt = Date.now();
      if (order.paymentMethod === 'COD') {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    if (status === 'cancelled') {
      order.cancelledAt = Date.now();
    }

    await order.save();

    console.log('✅ Order status updated:', order._id, '→', status);

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      order
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật trạng thái đơn hàng' 
    });
  }
};

// =====================================
// 6. CANCEL ORDER
// =====================================
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đơn hàng' 
      });
    }

    // 🔒 CHECK AUTHORIZATION
    if (order.userId.toString() !== req.userId && req.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền hủy đơn hàng này' 
      });
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể hủy đơn hàng này' 
      });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy đơn hàng đang chờ xác nhận hoặc đã xác nhận'
      });
    }

    // Restore stock
    for (let item of order.items) {
      // 🔥 FIX: Handle both ObjectId and Number productId
      let product = null;
      
      // Try finding by _id (ObjectId) first
      if (mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findOne({ 
          _id: item.productId,
          isActive: true 
        });
      }
      
      // Fallback: Try productId (Number)
      if (!product && !isNaN(item.productId)) {
        product = await Product.findOne({ 
          productId: Number(item.productId),
          isActive: true 
        });
      }
      
      // Last resort: Try name
      if (!product && item.name) {
        product = await Product.findOne({ 
          name: item.name,
          isActive: true 
        });
      }

      if (product && product.stock !== undefined) {
        const oldStock = product.stock;
        
        await Product.findByIdAndUpdate(
          product._id,
          {
            $inc: { 
              stock: item.quantity,
              soldCount: -item.quantity
            }
          }
        );
        
        console.log(`📈 ${product.name}: ${oldStock} → ${oldStock + item.quantity}`);
      }
    }

    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    await order.save();

    console.log('✅ Order cancelled:', order._id);

    res.json({
      success: true,
      message: 'Hủy đơn hàng thành công',
      order
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi hủy đơn hàng' 
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
};