// backend/src/orders/order.model.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: Number,  // 🔥 ĐỔI: Frontend dùng Number ID, không phải ObjectId
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  size: {
    type: String,
    default: null  // 🔥 THÊM: default null
  },
  image: {
    type: String,
    required: true  // 🔥 THÊM: required
  }
});

const orderSchema = new mongoose.Schema({
  userId: {  // 🔥 ĐỔI TÊN: từ user -> userId
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: {  // 🔥 ĐỔI TÊN: từ name -> fullName
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {  // 🔥 THÊM: field email
      type: String
    },
    address: {
      type: String,
      required: true
    },
    ward: {  // 🔥 ĐỔI: bắt buộc phải có
      type: String,
      required: true
    },
    district: {  // 🔥 ĐỔI: bắt buộc phải có
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'BANK', 'CARD', 'Momo', 'ZaloPay'],  // 🔥 THÊM: BANK, CARD
    default: 'COD'
  },
  note: {  // 🔥 ĐỔI TÊN: từ notes -> note
    type: String
  },
  subtotal: {  // 🔥 THÊM: subtotal riêng
    type: Number,
    required: true,
    min: 0
  },
  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {  // 🔥 ĐỔI: totalAmount là tổng cuối cùng
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],  // 🔥 BỎ: processing
    default: 'pending'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {  // 🔥 THÊM: cancelledAt
    type: Date
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;