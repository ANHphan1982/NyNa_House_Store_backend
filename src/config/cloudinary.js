// backend/src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

/**
 * 🖼️ CLOUDINARY CONFIGURATION
 * Free tier: 25GB storage + 25GB bandwidth/month
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage configuration for products
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nyna-house-store/products', // Organize by folder
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' }, // Max 1000x1000
      { quality: 'auto' }, // Auto quality optimization
      { fetch_format: 'auto' } // Auto format (WebP if supported)
    ]
  }
});

// Storage for categories/banners
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nyna-house-store/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 600, height: 400, crop: 'fill' },
      { quality: 'auto' }
    ]
  }
});

// Multer upload middleware
const uploadProduct = multer({ 
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Max 5MB
  }
});

const uploadCategory = multer({ 
  storage: categoryStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 // Max 3MB
  }
});

/**
 * Helper: Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ Image deleted:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
};

/**
 * Helper: Get optimized URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width = 800,
    height = 800,
    crop = 'limit',
    quality = 'auto',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop },
      { quality, fetch_format: format }
    ]
  });
};

module.exports = {
  cloudinary,
  uploadProduct,
  uploadCategory,
  deleteImage,
  getOptimizedUrl
};