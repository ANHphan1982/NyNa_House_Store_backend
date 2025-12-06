// backend/src/orders/order.model.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // 🔥 USER ID - Optional now (for guest checkout)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // 🔥 Changed from true to false
  },
  
  // 🔥 NEW: Guest information (if no userId)
  guestInfo: {
    name: {
      type: String,
      required: function() {
        return !this.userId; // Required if no userId
      }
    },
    phone: {
      type: String,
      required: function() {
        return !this.userId;
      }
    },
    email: {
      type: String,
      required: false
    }
  },
  
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: String,
    image: String
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
    email: String,
    address: {
      type: String,
      required: true
    },
    ward: String,
    district: String,
    city: String
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
  
  isPaid: Boolean,
  paidAt: Date,
  
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
  
  // 🔥 NEW: Order type
  orderType: {
    type: String,
    enum: ['user', 'guest'],
    default: function() {
      return this.userId ? 'user' : 'guest';
    }
  },
  
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelReason: String
  
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ 'guestInfo.phone': 1 }); // 🔥 NEW: Index for guest lookup
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual: orderNumber
orderSchema.virtual('orderNumber').get(function() {
  return this._id.toString().slice(-8).toUpperCase();
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);