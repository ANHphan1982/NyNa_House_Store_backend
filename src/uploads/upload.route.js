// backend/src/uploads/upload.route.js
const express = require('express');
const router = express.Router();

// 🔥 TRY-CATCH import để debug
let upload, cloudinary;

try {
  const cloudinaryModule = require('../config/cloudinary');
  upload = cloudinaryModule.upload;
  cloudinary = cloudinaryModule.cloudinary;
  
  if (!upload) {
    throw new Error('Upload instance is undefined');
  }
  if (!cloudinary) {
    throw new Error('Cloudinary instance is undefined');
  }
  
  console.log('✅ Cloudinary module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load cloudinary module:', error);
  console.error('Make sure:');
  console.error('1. File src/config/cloudinary.js exists');
  console.error('2. Dependencies installed: npm install cloudinary multer multer-storage-cloudinary');
  console.error('3. Environment variables set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  throw error;
}

const { verifyAdminToken } = require('../middleware/verifyAdminToken');

console.log('✅ Upload routes loaded');

// UPLOAD SINGLE IMAGE
router.post('/image', verifyAdminToken, (req, res, next) => {
  // Check if upload middleware is available
  if (!upload) {
    return res.status(500).json({
      success: false,
      message: 'Upload service is not configured properly'
    });
  }
  
  // Use upload middleware
  upload.single('image')(req, res, next);
}, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file nào được upload'
      });
    }

    console.log('✅ Image uploaded to Cloudinary:', req.file.path);

    res.json({
      success: true,
      message: 'Upload ảnh thành công',
      imageUrl: req.file.path,
      publicId: req.file.filename
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh: ' + error.message
    });
  }
});

// UPLOAD MULTIPLE IMAGES
router.post('/images', verifyAdminToken, (req, res, next) => {
  if (!upload) {
    return res.status(500).json({
      success: false,
      message: 'Upload service is not configured properly'
    });
  }
  
  upload.array('images', 5)(req, res, next);
}, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có file nào được upload'
      });
    }

    const imageUrls = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));

    console.log(`✅ ${req.files.length} images uploaded to Cloudinary`);

    res.json({
      success: true,
      message: `Upload ${req.files.length} ảnh thành công`,
      images: imageUrls
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh: ' + error.message
    });
  }
});

// DELETE IMAGE FROM CLOUDINARY
router.delete('/image/:publicId', verifyAdminToken, async (req, res) => {
  try {
    if (!cloudinary) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary service is not configured properly'
      });
    }

    const { publicId } = req.params;
    const decodedPublicId = decodeURIComponent(publicId);

    const result = await cloudinary.uploader.destroy(decodedPublicId);

    if (result.result === 'ok') {
      console.log('✅ Image deleted from Cloudinary:', decodedPublicId);
      res.json({
        success: true,
        message: 'Xóa ảnh thành công'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Không thể xóa ảnh'
      });
    }

  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa ảnh: ' + error.message
    });
  }
});

module.exports = router;