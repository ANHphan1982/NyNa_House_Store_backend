// backend/src/admin/admin.stats.js
const Order = require('../orders/order.model');
const Product = require('../products/product.model');
const User = require('../users/user.model');

const getAdminStats = async (req, res) => {
  try {
    console.log('📊 Fetching admin stats...');

    // Đếm products
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Đếm orders
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const shippingOrders = await Order.countDocuments({ status: 'shipping' });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    // Tính tổng doanh thu (chỉ đơn hoàn thành)
    const revenueResult = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Đếm customers
    const totalCustomers = await User.countDocuments({ role: 'user' });

    // Revenue by month (12 tháng gần nhất)
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const stats = {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue,
      pendingOrders,
      confirmedOrders,
      shippingOrders,
      completedOrders,
      cancelledOrders,
      monthlyRevenue
    };

    console.log('✅ Admin stats:', stats);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

module.exports = { getAdminStats };
