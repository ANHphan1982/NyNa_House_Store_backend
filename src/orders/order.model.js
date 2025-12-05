// backend/src/orders/order.model.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId, // 🔥 FIXED: ObjectId thay vì Number
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: {
      type: String,
      default: 'M'
    },
    image: {
      type: String
    }
  }],
  shippingAddress: {
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String
    },
    address: {
      type: String,
      required: true
    },
    ward: {
      type: String
    },
    district: {
      type: String
    },
    city: {
      type: String
    }
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'BANK', 'CARD', 'MOMO', 'ZALOPAY'],
    default: 'COD'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  shippingFee: {
    type: Number,
    default: 30000
  },
  totalAmount: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
    default: 'pending'
  },
  confirmedAt: {
    type: Date
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// 🔒 INDEXES
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.productId': 1 });
orderSchema.index({ createdAt: -1 });

// 🔒 VIRTUAL: orderNumber
orderSchema.virtual('orderNumber').get(function() {
  return this._id.toString().slice(-8).toUpperCase();
});

// 🔒 Convert to JSON with virtuals
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;