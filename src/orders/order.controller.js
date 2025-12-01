// backend/src/orders/order.controller.js
const Order = require('./order.model');
const Product = require('../products/product.model');

// Create new order
const createOrder = async (req, res) => {
  try {
    const { 
      products,      // 🔥 Frontend gửi "products"
      items,         // 🔥 Fallback cho "items"
      shippingAddress, 
      paymentMethod, 
      notes,         // 🔥 Frontend gửi "notes"
      note,          // 🔥 Fallback cho "note"
      subtotal,
      shippingFee, 
      totalAmount 
    } = req.body;

    console.log('📦 Creating order for user:', req.userId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    // 🔥 FIX: Accept both "products" and "items"
    const orderItems = products || items;

    // Validate items
    if (!orderItems || orderItems.length === 0) {
      console.log('❌ No items in order');
      return res.status(400).json({ 
        success: false, 
        message: 'Đơn hàng phải có ít nhất 1 sản phẩm' 
      });
    }

    console.log('✅ Order has', orderItems.length, 'items');

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin địa chỉ giao hàng' 
      });
    }

    // 🔥 BƯỚC 1: KIỂM TRA VÀ LẤY THÔNG TIN PRODUCTS
    const productChecks = [];
    const validatedItems = [];
    
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      
      console.log(`🔍 Processing item ${i}:`, JSON.stringify(item, null, 2));
      
      // 🔥 TÌM THEO NHIỀU CÁCH
      let product = null;
      
      // Cách 1: Tìm theo productId (Number từ localStorage)
      if (item.productId) {
        product = await Product.findOne({ productId: item.productId });
        if (product) {
          console.log(`✅ Found by productId: ${item.productId} -> ${product.name}`);
        }
      }
      
      // Cách 2: Nếu không tìm thấy, tìm theo tên chính xác
      if (!product && item.name) {
        product = await Product.findOne({ 
          name: item.name,
          isActive: true
        });
        if (product) {
          console.log(`✅ Found by exact name: ${item.name}`);
        }
      }
      
      // Cách 3: Nếu vẫn không có, tìm theo tên gần giống
      if (!product && item.name) {
        product = await Product.findOne({ 
          name: { $regex: new RegExp(item.name, 'i') },
          isActive: true
        });
        if (product) {
          console.log(`✅ Found by name regex: ${item.name}`);
        }
      }

      if (!product) {
        console.log(`❌ Product not found:`, item);
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm: ${item.name || item.productId}. Vui lòng thử lại sau.`
        });
      }

      // Kiểm tra stock
      if (product.stock !== undefined && product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho, bạn đang đặt ${item.quantity}`
        });
      }

      productChecks.push({
        product: product,
        quantity: item.quantity
      });

      // 🔥 CREATE validated item với đầy đủ thông tin
      validatedItems.push({
        productId: product.productId || item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price || product.price,
        size: item.selectedSize || item.size || null,
        image: product.image || item.image
      });
    }

    console.log('✅ All products validated');
    console.log('📦 Validated items:', JSON.stringify(validatedItems, null, 2));

    // 🔥 FIX: Normalize paymentMethod to uppercase
    const normalizedPaymentMethod = (paymentMethod || 'cod').toUpperCase();
    
    // Validate payment method
    const validMethods = ['COD', 'BANK', 'CARD', 'MOMO', 'ZALOPAY'];
    if (!validMethods.includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    // 🔥 Calculate totals if not provided
    const calculatedSubtotal = subtotal || validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculatedShippingFee = shippingFee !== undefined ? shippingFee : 30000;
    const calculatedTotal = totalAmount || (calculatedSubtotal + calculatedShippingFee);

    // 🔥 BƯỚC 2: TẠO ORDER
    const newOrder = new Order({
      userId: req.userId,
      items: validatedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        email: shippingAddress.email || '',
        address: shippingAddress.address,
        ward: shippingAddress.ward || 'N/A',
        district: shippingAddress.district || 'N/A',
        city: shippingAddress.city || 'N/A'
      },
      paymentMethod: normalizedPaymentMethod,
      note: notes || note || '',
      subtotal: calculatedSubtotal,
      shippingFee: calculatedShippingFee,
      totalAmount: calculatedTotal
    });

    await newOrder.save();

    // 🔥 BƯỚC 3: CẬP NHẬT STOCK
    for (let check of productChecks) {
      const oldStock = check.product.stock;
      
      if (oldStock !== undefined) {
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

    console.log('✅ Order created:', newOrder._id);

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
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tạo đơn hàng: ' + error.message
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    console.log('🔍 Fetching orders for user:', req.userId);

    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 });

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

// Get order by ID
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

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
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

// Update order status (Admin)
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

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đơn hàng' 
      });
    }

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

    // 🔥 HOÀN TRẢ STOCK
    for (let item of order.items) {
      let product = null;
      
      // Tìm theo productId
      if (item.productId) {
        product = await Product.findOne({ productId: item.productId });
      }
      
      // Fallback: tìm theo tên
      if (!product) {
        product = await Product.findOne({ name: item.name });
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