// backend/src/uploads/upload.route.js
const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { verifyAdminToken } = require('../middleware/verifyAdminToken');

console.log('✅ Upload routes loaded');

// UPLOAD SINGLE IMAGE
router.post('/image', verifyAdminToken, upload.single('image'), (req, res) => {
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
router.post('/images', verifyAdminToken, upload.array('images', 5), (req, res) => {
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
    const { publicId } = req.params;
    const decodedPublicId = decodeURIComponent(publicId);

    const { cloudinary } = require('../config/cloudinary');
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