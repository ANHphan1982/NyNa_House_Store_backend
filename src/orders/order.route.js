router.post('/', verifyToken, async (req, res) => {
  try {
    const { products, shippingAddress, paymentMethod } = req.body;

    // 🔥 VALIDATE AND CONVERT products
    const validatedProducts = [];
    
    for (const item of products) {
      let product;
      
      // 🔥 TRY productId (Number) FIRST
      if (item.productId && !isNaN(item.productId)) {
        product = await Product.findOne({ productId: Number(item.productId) });
      }
      
      // 🔥 FALLBACK: Try _id (ObjectId)
      if (!product && mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findById(item.productId);
      }

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm không tồn tại: ${item.productId}`
        });
      }

      // Check stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" không đủ hàng`
        });
      }

      validatedProducts.push({
        productId: product.productId || product._id, // Use numeric ID if exists
        _id: product._id, // Keep ObjectId for reference
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        size: item.size || 'M'
      });
    }

    // Create order with validated products
    const order = new Order({
      userId: req.userId,
      items: validatedProducts.map(p => ({
        productId: p._id, // Store ObjectId in order
        quantity: p.quantity,
        size: p.size,
        price: p.price
      })),
      shippingAddress,
      paymentMethod,
      totalAmount: validatedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    });

    await order.save();

    // Update stock
    for (const item of validatedProducts) {
      await Product.findByIdAndUpdate(item._id, {
        $inc: { stock: -item.quantity }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order: order
    });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đơn hàng: ' + error.message
    });
  }
});