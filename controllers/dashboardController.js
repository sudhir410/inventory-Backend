const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    // Get total products
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Get total customers
    const totalCustomers = await Customer.countDocuments({ isActive: true });

    // Get total sales
    const totalSales = await Sale.countDocuments();

    // Get total revenue
    const revenueResult = await Sale.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get low stock products
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$stock.current', '$stock.minimum'] },
      isActive: true
    });

    // Get pending payments
    const pendingPaymentsResult = await Sale.aggregate([
      { $match: { paymentStatus: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } }
    ]);
    const pendingPayments = pendingPaymentsResult.length > 0 ? pendingPaymentsResult[0].total : 0;

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Get today's revenue
    const todayRevenueResult = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          paymentStatus: { $in: ['paid', 'partial'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);
    const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        totalSales,
        totalRevenue,
        lowStockProducts,
        pendingPayments,
        todaySales,
        todayRevenue
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/dashboard/activities
// @access  Private
const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent sales
    const recentSales = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('customer', 'name')
      .populate('createdBy', 'name')
      .select('invoiceNumber customer total paymentStatus createdAt createdBy');

    // Get recent payments
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('customer', 'name')
      .populate('createdBy', 'name')
      .select('receiptNumber customer amount paymentMethod createdAt createdBy');

    // Combine and sort activities
    const activities = [
      ...recentSales.map(sale => ({
        type: 'sale',
        id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        customer: sale.customer?.name || 'Unknown',
        amount: sale.total,
        status: sale.paymentStatus,
        date: sale.createdAt,
        user: sale.createdBy?.name || 'Unknown'
      })),
      ...recentPayments.map(payment => ({
        type: 'payment',
        id: payment._id,
        receiptNumber: payment.receiptNumber,
        customer: payment.customer?.name || 'Unknown',
        amount: payment.amount,
        method: payment.paymentMethod,
        date: payment.createdAt,
        user: payment.createdBy?.name || 'Unknown'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

    res.json({
      success: true,
      data: {
        activities
      }
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activities',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities
};

