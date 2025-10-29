const { validationResult } = require('express-validator');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by customer
    if (req.query.customer) {
      query.customer = req.query.customer;
    }

    // Filter by payment status
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Search by invoice number
    if (req.query.search) {
      query.invoiceNumber = { $regex: req.query.search, $options: 'i' };
    }

    const sales = await Sale.find(query)
      .populate('customer', 'name phone email')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: {
        sales,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
const getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name email phone address gstNumber')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku category price');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: { sale }
    });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create sale
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      customer,
      items,
      discount,
      tax,
      paymentMethod,
      paid,
      dueDate,
      notes
    } = req.body;

    // Convert string numbers to actual numbers
    const discountAmount = parseFloat(discount) || 0;
    const taxAmount = parseFloat(tax) || 0;
    const paidAmount = parseFloat(paid) || 0;

    // Check if customer exists
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate and check stock for products
    let subtotal = 0;
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (product.stock.current < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock.current}`
        });
      }

      // Convert item values to numbers
      item.quantity = parseFloat(item.quantity) || 0;
      item.price = parseFloat(item.price) || 0;
      item.discount = parseFloat(item.discount) || 0;
      item.total = (item.price * item.quantity) - item.discount;
      subtotal += item.total;
    }

    const total = subtotal - discountAmount + taxAmount;
    const balance = total - paidAmount;

    // Determine payment status (use small tolerance for floating point comparison)
    let paymentStatus;
    if (balance < -0.01) {
      // Paid more than total (overpaid/advance payment)
      paymentStatus = 'overpaid';
    } else if (Math.abs(balance) < 0.01) {
      // Balance is essentially zero (paid in full)
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      // Partial payment made
      paymentStatus = 'partial';
    } else {
      // No payment made
      paymentStatus = 'pending';
    }

    // Generate invoice number
    const date = new Date();
    const invoiceNumber = `INV-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    const saleData = {
      invoiceNumber,
      customer,
      items,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      paid: paidAmount,
      balance: Math.abs(balance) < 0.01 ? 0 : balance, // Round balance to 0 if very small
      paymentMethod: paymentMethod || 'cash',
      paymentStatus,
      dueDate,
      notes,
      createdBy: req.user._id
    };

    const sale = await Sale.create(saleData);

    // Update product stock
    for (let item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'stock.current': -item.quantity }
      });
    }

    // Update customer data
    const customerUpdate = {
      $inc: { 
        totalPurchase: total,  // Add total purchase amount
        outstandingAmount: sale.balance  // Add outstanding balance (can be negative for overpayment)
      },
      lastPurchase: new Date()
    };
    await Customer.findByIdAndUpdate(customer, customerUpdate);

    await sale.populate('customer', 'name phone email');
    await sale.populate('createdBy', 'name email');
    await sale.populate('items.product', 'name sku price');

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: { sale }
    });
  } catch (error) {
    console.error('Create sale error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle duplicate invoice number
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        error: error.message
      });
    }
    
    // General server error
    res.status(500).json({
      success: false,
      message: 'Server error during sale creation',
      error: error.message  // Always send error message to frontend
    });
  }
};

// @desc    Update sale
// @route   PUT /api/sales/:id
// @access  Private/Admin/Manager
const updateSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update cancelled sale'
      });
    }

    // Store old values for customer update calculation
    const oldTotal = sale.total;
    const oldBalance = sale.balance;

    // Update sale fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        sale[key] = req.body[key];
      }
    });

    // Recalculate totals if items are updated
    if (req.body.items) {
      let subtotal = 0;
      for (let item of req.body.items) {
        item.quantity = parseFloat(item.quantity) || 0; // Ensure numbers
        item.price = parseFloat(item.price) || 0;       // Ensure numbers
        item.discount = parseFloat(item.discount) || 0; // Ensure numbers
        item.total = (item.price * item.quantity) - item.discount;
        subtotal += item.total;
      }
      sale.subtotal = subtotal;
      sale.discount = parseFloat(req.body.discount) || sale.discount; // Ensure numbers
      sale.tax = parseFloat(req.body.tax) || sale.tax;               // Ensure numbers
      sale.total = sale.subtotal - sale.discount + sale.tax;
      sale.paid = parseFloat(req.body.paid) || sale.paid;            // Ensure numbers
    }

    // Always recalculate balance and payment status (in case paid amount changed)
    const currentBalance = sale.total - sale.paid;
    sale.balance = Math.abs(currentBalance) < 0.01 ? 0 : currentBalance;

    // Update payment status based on balance
    if (sale.balance < -0.01) {
      // Overpaid (customer has credit)
      sale.paymentStatus = 'overpaid';
    } else if (Math.abs(sale.balance) < 0.01) {
      // Paid in full
      sale.paymentStatus = 'paid';
    } else if (sale.paid > 0) {
      // Partial payment
      sale.paymentStatus = 'partial';
    } else {
      // No payment
      sale.paymentStatus = 'pending';
    }

    await sale.save();

    // Update customer data - adjust for the difference
    const totalDiff = sale.total - oldTotal;
    const balanceDiff = sale.balance - oldBalance;
    
    if (totalDiff !== 0 || balanceDiff !== 0) {
      const customerUpdate = {
        $inc: {
          totalPurchase: totalDiff,  // Adjust total purchase by difference
          outstandingAmount: balanceDiff  // Adjust outstanding by difference
        },
        lastPurchase: new Date()
      };
      await Customer.findByIdAndUpdate(sale.customer, customerUpdate);
    }

    await sale.populate('customer', 'name phone email');
    await sale.populate('createdBy', 'name email');
    await sale.populate('items.product', 'name sku price');

    res.json({
      success: true,
      message: 'Sale updated successfully',
      data: { sale }
    });
  } catch (error) {
    console.error('Update sale error:', error);
    console.error('Error message:', error.message);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during sale update',
      error: error.message  // Always send error message to frontend
    });
  }
};

// @desc    Delete sale
// @route   DELETE /api/sales/:id
// @access  Private/Admin/Manager
const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Sale is already cancelled'
      });
    }

    // Restore product stock
    for (let item of sale.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'stock.current': item.quantity }
      });
    }

    // Update customer data - reverse the sale impact
    await Customer.findByIdAndUpdate(sale.customer, {
      $inc: { 
        totalPurchase: -sale.total,      // Subtract the sale total
        outstandingAmount: -sale.balance  // Subtract the outstanding balance
      }
    });

    sale.status = 'cancelled';
    await sale.save();

    res.json({
      success: true,
      message: 'Sale cancelled successfully'
    });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during sale cancellation'
    });
  }
};

// @desc    Get sales statistics
// @route   GET /api/sales/stats
// @access  Private
const getSalesStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const totalSales = await Sale.countDocuments({ status: 'completed' });
    const todaySales = await Sale.countDocuments({
      status: 'completed',
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });

    const totalRevenue = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const todayRevenue = await Sale.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfDay, $lt: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const pendingPayments = await Sale.aggregate([
      { $match: { status: 'completed', balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    const salesByPaymentMethod = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalSales,
        todaySales,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        pendingPayments: pendingPayments[0]?.total || 0,
        salesByPaymentMethod
      }
    });
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  getSalesStats
};
