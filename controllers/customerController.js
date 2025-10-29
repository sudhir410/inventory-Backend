const { validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Filter by credit status
    if (req.query.creditStatus) {
      if (req.query.creditStatus === 'over_limit') {
        query.$and = [
          { outstandingAmount: { $gt: 0 } },
          { $expr: { $gt: ['$outstandingAmount', '$creditLimit'] } }
        ];
      } else if (req.query.creditStatus === 'clear') {
        query.outstandingAmount = 0;
      } else if (req.query.creditStatus === 'within_limit') {
        query.$and = [
          { outstandingAmount: { $gt: 0 } },
          { $expr: { $lte: ['$outstandingAmount', '$creditLimit'] } }
        ];
      }
    }

    // Search by name, email, or phone
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Recalculate outstanding amount and total purchase for each customer from actual sales
    const customersWithCalculatedOutstanding = await Promise.all(
      customers.map(async (customer) => {
        const sales = await Sale.find({
          customer: customer._id,
          status: { $ne: 'cancelled' }
        }).select('balance total');

        // Calculate total outstanding and total purchase from all sales
        const calculatedOutstanding = sales.reduce((sum, sale) => sum + sale.balance, 0);
        const calculatedTotalPurchase = sales.reduce((sum, sale) => sum + sale.total, 0);

        // Return customer with calculated values
        const customerObj = customer.toObject();
        customerObj.calculatedOutstanding = calculatedOutstanding;
        customerObj.outstandingAmount = calculatedOutstanding; // Override with calculated value
        customerObj.totalPurchase = calculatedTotalPurchase; // Override with calculated value
        
        return customerObj;
      })
    );

    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: {
        customers: customersWithCalculatedOutstanding,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get all sales for this customer
    const allSales = await Sale.find({ 
      customer: req.params.id,
      status: { $ne: 'cancelled' }  // Exclude cancelled sales
    })
      .sort({ createdAt: -1 })
      .select('invoiceNumber total paid balance paymentStatus createdAt status')
      .populate('items.product', 'name');

    // Get all payments for this customer
    const allPayments = await Payment.find({ customer: req.params.id })
      .sort({ createdAt: -1 })
      .select('receiptNumber amount paymentMethod createdAt totalAllocated sales')
      .populate('sales.sale', 'invoiceNumber');

    // Calculate aggregated statistics
    const salesStats = {
      totalSales: allSales.length,
      totalAmount: allSales.reduce((sum, sale) => sum + sale.total, 0),
      totalPaid: allSales.reduce((sum, sale) => sum + sale.paid, 0),
      totalOutstanding: allSales.reduce((sum, sale) => sum + sale.balance, 0),
      paidSales: allSales.filter(s => s.paymentStatus === 'paid' || s.paymentStatus === 'overpaid').length,
      pendingSales: allSales.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial').length,
      overpaidAmount: allSales
        .filter(s => s.balance < 0)
        .reduce((sum, sale) => sum + Math.abs(sale.balance), 0),
      unpaidAmount: allSales
        .filter(s => s.balance > 0)
        .reduce((sum, sale) => sum + sale.balance, 0)
    };

    const paymentStats = {
      totalPayments: allPayments.length,
      totalAmount: allPayments.reduce((sum, payment) => sum + payment.amount, 0)
    };

    // Overall status
    let overallStatus = 'clear';
    let statusMessage = 'All payments are clear';
    
    if (salesStats.totalOutstanding > 0.01) {
      overallStatus = 'outstanding';
      statusMessage = `Outstanding: ₹${salesStats.unpaidAmount.toFixed(2)}`;
    } else if (salesStats.totalOutstanding < -0.01) {
      overallStatus = 'credit';
      statusMessage = `Extra paid (Credit): ₹${salesStats.overpaidAmount.toFixed(2)}`;
    }

    res.json({
      success: true,
      data: {
        customer,
        sales: allSales,
        payments: allPayments,
        salesStats,
        paymentStats,
        overallStatus,
        statusMessage
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    const customer = await Customer.create(customerData);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during customer creation'
    });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update customer fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        customer[key] = req.body[key];
      }
    });

    await customer.save();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during customer update'
    });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin/Manager
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has outstanding balance
    if (customer.outstandingAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with outstanding balance'
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during customer deletion'
    });
  }
};

// @desc    Get customer statistics
// @route   GET /api/customers/stats
// @access  Private
const getCustomerStats = async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments({ isActive: true });
    const newCustomers = await Customer.countDocuments({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    const customersWithOutstanding = await Customer.countDocuments({
      isActive: true,
      outstandingAmount: { $gt: 0 }
    });

    const totalOutstanding = await Customer.aggregate([
      { $match: { isActive: true, outstandingAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } }
    ]);

    const customersByType = await Customer.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers,
        newCustomers,
        customersWithOutstanding,
        totalOutstanding: totalOutstanding[0]?.total || 0,
        customersByType
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
};
