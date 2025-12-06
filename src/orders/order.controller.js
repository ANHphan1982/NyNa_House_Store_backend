// backend/src/orders/order.controller.js
const Order = require('./order.model');
const Product = require('../products/product.model');
const mongoose = require('mongoose');

// =====================================
// 1. CREATE ORDER (User or Guest)
// =====================================

const createOrder = async (req, res) => {
  try {
    const { products, shippingAddress, paymentMethod, note, guestInfo } = req.body;
    const userId = req.userId; // May be null for guest orders

    console.log('📦 Creating order:', userId ? `User: ${userId}` : 'Guest order');
    console.log('✅ Order has', products?.length, 'items');
    
    // 🔥 VALIDATE: Guest orders need guestInfo
    if (!userId && !guestInfo) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin người mua là bắt buộc (tên, số điện thoại)'
      });
    }
    
    // Validate guestInfo if provided
    if (guestInfo) {
      if (!guestInfo.name || guestInfo.name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Tên phải có ít nhất 2 ký tự'
        });
      }
      
      if (!guestInfo.phone || !/^0\d{9}$/.test(guestInfo.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ'
        });
      }
    }

    // Validate products
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng phải có ít nhất 1 sản phẩm'
      });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin giao hàng không đầy đủ'
      });
    }

    // Validate and convert products
    const validatedItems = [];
    
    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      let product;
      
      console.log(`🔍 Processing item ${i}:`, item);

      // Try to find product by _id or productId
      if (mongoose.Types.ObjectId.isValid(item.productId) && item.productId.length === 24) {
        console.log('   → Querying by _id (ObjectId):', item.productId);
        product = await Product.findOne({ _id: item.productId, isActive: true });
      } else if (!isNaN(item.productId)) {
        console.log('   → Querying by productId (Number):', item.productId);
        product = await Product.findOne({ productId: Number(item.productId), isActive: true });
      }

      if (!product && item.name) {
        console.log('   → Querying by name:', item.name);
        product = await Product.findOne({ name: item.name, isActive: true });
      }

      if (!product) {
        console.log(`❌ Product not found:`, item.productId);
        return res.status(400).json({
          success: false,
          message: `Sản phẩm không tồn tại: ${item.name || item.productId}`
        });
      }

      console.log(`   ✅ Found by _id: ${product.name}`);

      // Check stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" không đủ hàng (còn ${product.stock})`
        });
      }

      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        size: item.size || 'M',
        image: product.image
      });
    }

    console.log('✅ All products validated');

    // Calculate totals
    const subtotal = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = 30000; // Fixed shipping fee
    const totalAmount = subtotal + shippingFee;

    console.log('💰 Order totals:', { subtotal, shippingFee, total: totalAmount });

    // 🔥 CREATE ORDER (with optional userId and guestInfo)
    const orderData = {
      items: validatedItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      subtotal,
      shippingFee,
      totalAmount,
      note: note || '',
      status: 'pending',
      paymentStatus: 'pending'
    };
    
    // Add userId if user is logged in
    if (userId) {
      orderData.userId = userId;
      orderData.orderType = 'user';
    } else {
      // Guest order
      orderData.guestInfo = {
        name: guestInfo.name.trim(),
        phone: guestInfo.phone.trim(),
        email: guestInfo.email?.trim() || shippingAddress.email?.trim()
      };
      orderData.orderType = 'guest';
    }

    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order saved:', order._id);

    // Update product stock
    for (const item of validatedItems) {
      const updateResult = await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      
      if (updateResult) {
        console.log(`📉 ${updateResult.name}: ${updateResult.stock + item.quantity} → ${updateResult.stock}`);
      }
    }

    console.log('✅ Order created successfully');

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        orderType: order.orderType,
        createdAt: order.createdAt
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
    const orders = await Order.find({ userId: req.userId })
      .sort('-createdAt')
      .populate('items.productId', 'name image price');

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
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name image price');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đơn hàng' 
      });
    }

    // 🔥 Check permission: Admin or owner (user) or guest with matching phone
    const isAdmin = req.role === 'admin' || req.isAdmin;
    const isOwner = order.userId && order.userId._id.toString() === req.userId;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền xem đơn hàng này' 
      });
    }

    console.log(`✅ Order details retrieved by ${isAdmin ? 'Admin' : 'User'}`);

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
// 4. GET ALL ORDERS (Admin)
// =====================================

const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      orderType 
    } = req.query;

    console.log('📦 Fetching all orders (admin)');

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;

    // Execute query
    const orders = await Order.find(filter)
      .sort('-createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name image price');

    const total = await Order.countDocuments(filter);

    console.log(`✅ Found ${orders.length} orders`);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
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
// 5. UPDATE ORDER STATUS (Admin)
// =====================================

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

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

    // 🔥 CHECK: If changing to cancelled, restore stock
    const oldStatus = order.status;
    const isBeingCancelled = status === 'cancelled' && oldStatus !== 'cancelled';

    // Update status
    order.status = status;

    // Set timestamp based on status
    if (status === 'confirmed') order.confirmedAt = Date.now();
    if (status === 'shipping') order.shippedAt = Date.now();
    if (status === 'delivered') order.deliveredAt = Date.now();
    if (status === 'cancelled') order.cancelledAt = Date.now();

    await order.save();

    console.log(`✅ Order status updated: ${order._id} → ${status}`);

    // 🔥 RESTORE STOCK if order is being cancelled
    if (isBeingCancelled) {
      console.log('🔄 Restoring stock for cancelled order...');
      
      const Product = require('../products/product.model');
      const mongoose = require('mongoose');

      for (const item of order.items) {
        let product;
        
        // Try to find product by ObjectId first
        if (mongoose.Types.ObjectId.isValid(item.productId)) {
          product = await Product.findById(item.productId);
        }
        
        // If not found, try by productId (Number)
        if (!product && typeof item.productId === 'number') {
          product = await Product.findOne({ productId: item.productId });
        }

        if (product) {
          const oldStock = product.stock;
          product.stock += item.quantity;
          await product.save();
          
          console.log(`📈 Stock restored: ${product.name} (${oldStock} → ${product.stock}) +${item.quantity}`);
        } else {
          console.warn(`⚠️ Product not found for stock restore:`, item.productId);
        }
      }

      console.log('✅ Stock restoration completed');
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      order
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái'
    });
  }
};

// =====================================
// 6. CANCEL ORDER
// =====================================

const cancelOrder = async (req, res) => {
  try {
    const { cancelReason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Check permission
    const isAdmin = req.role === 'admin' || req.isAdmin;
    const isOwner = order.userId && order.userId.toString() === req.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn hàng này'
      });
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy đơn hàng đang giao hoặc đã giao'
      });
    }

    // Update order
    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    order.cancelReason = cancelReason || 'Khách hàng yêu cầu hủy';

    await order.save();

    // Restore stock
    for (const item of order.items) {
      let product;
      
      if (mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findById(item.productId);
      } else {
        product = await Product.findOne({ productId: item.productId });
      }

      if (product) {
        product.stock += item.quantity;
        await product.save();
        console.log(`📈 Restored stock: ${product.name} +${item.quantity}`);
      }
    }

    console.log(`✅ Order cancelled: ${order._id}`);

    res.json({
      success: true,
      message: 'Đơn hàng đã được hủy',
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