// backend/src/products/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: Number,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Quần áo', 'Giày dép', 'Mỹ phẩm', 'Thực phẩm', 'Tiêu dùng', 'Gia dụng']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sizes: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  soldCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for search
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ productId: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;