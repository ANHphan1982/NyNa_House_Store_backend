// backend/src/admin/admin.route.js
const express = require('express');
const router = express.Router();
const { getAdminStats } = require('./admin.stats');
const { verifyAdminToken } = require('../middleware/verifyAdminToken');

router.get('/stats', verifyAdminToken, getAdminStats);

module.exports = router;