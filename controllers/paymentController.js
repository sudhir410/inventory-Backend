const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by customer
    if (req.query.customer) {
      query.customer = req.query.customer;
    }

    // Filter by payment method
    if (req.query.paymentMethod) {
      query.paymentMethod = req.query.paymentMethod;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.paymentDate = {};
      if (req.query.startDate) {
        query.paymentDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.paymentDate.$lte = new Date(req.query.endDate);
      }
    }

    // Search by receipt number
    if (req.query.search) {
      query.receiptNumber = { $regex: req.query.search, $options: 'i' };
    }

    const payments = await Payment.find(query)
      .populate('customer', 'name phone email')
      .populate('createdBy', 'name email')
      .populate('sales.sale', 'invoiceNumber total')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('createdBy', 'name email')
      .populate('sales.sale', 'invoiceNumber total balance');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res) => {
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
      amount,
      paymentMethod,
      reference,
      notes,
      sales
    } = req.body;

    // Check if customer exists
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Generate receipt number
    const date = new Date();
    const receiptNumber = `REC-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    let totalAllocated = 0;
    const paymentData = {
      receiptNumber,
      customer,
      amount,
      paymentMethod,
      reference,
      notes,
      sales: [],
      createdBy: req.user._id
    };

    // Allocate payment to sales if provided
    if (sales && sales.length > 0) {
      for (let allocation of sales) {
        const sale = await Sale.findById(allocation.sale);
        if (!sale) {
          return res.status(404).json({
            success: false,
            message: `Sale not found: ${allocation.sale}`
          });
        }

        if (sale.balance <= 0) {
          return res.status(400).json({
            success: false,
            message: `Sale ${sale.invoiceNumber} has no outstanding balance`
          });
        }

        const allocationAmount = Math.min(allocation.amount, sale.balance);
        paymentData.sales.push({
          sale: allocation.sale,
          amount: allocationAmount
        });

        totalAllocated += allocationAmount;

        // Store old balance before updating
        const oldBalance = sale.balance;

        // Update sale payment
        sale.paid += allocationAmount;
        sale.balance -= allocationAmount;
        
        // Update payment status with proper checks (including overpaid)
        if (sale.balance < -0.01) {
          sale.paymentStatus = 'overpaid';
        } else if (Math.abs(sale.balance) < 0.01) {
          sale.paymentStatus = 'paid';
        } else if (sale.paid > 0) {
          sale.paymentStatus = 'partial';
        } else {
          sale.paymentStatus = 'pending';
        }
        
        await sale.save();

        // Update customer outstanding based on balance change
        const balanceChange = sale.balance - oldBalance; // This will be negative (reduction)
        await Customer.findByIdAndUpdate(sale.customer, {
          $inc: { outstandingAmount: balanceChange }
        });
      }
    }

    paymentData.totalAllocated = totalAllocated;

    const payment = await Payment.create(paymentData);

    await payment.populate('customer', 'name phone email');
    await payment.populate('createdBy', 'name email');
    await payment.populate('sales.sale', 'invoiceNumber total');

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during payment creation'
    });
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private
const updatePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const {
      amount,
      paymentMethod,
      paymentDate,
      reference,
      notes,
      sales
    } = req.body;

    // Store old allocations to reverse them
    const oldSales = payment.sales || [];
    const oldAmount = payment.amount;

    // Reverse old allocations from sales
    for (let oldAllocation of oldSales) {
      const sale = await Sale.findById(oldAllocation.sale);
      if (sale) {
        const oldBalance = sale.balance;
        
        // Reverse the old payment
        sale.paid -= oldAllocation.amount;
        sale.balance += oldAllocation.amount;
        
        // Update payment status
        if (sale.balance < -0.01) {
          sale.paymentStatus = 'overpaid';
        } else if (Math.abs(sale.balance) < 0.01) {
          sale.paymentStatus = 'paid';
        } else if (sale.paid > 0) {
          sale.paymentStatus = 'partial';
        } else {
          sale.paymentStatus = 'pending';
        }
        
        await sale.save();

        // Update customer outstanding (reverse the old change)
        const balanceChange = sale.balance - oldBalance;
        await Customer.findByIdAndUpdate(sale.customer, {
          $inc: { outstandingAmount: balanceChange }
        });
      }
    }

    // Update payment basic fields
    payment.amount = amount || payment.amount;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.paymentDate = paymentDate || payment.paymentDate;
    payment.reference = reference !== undefined ? reference : payment.reference;
    payment.notes = notes !== undefined ? notes : payment.notes;

    // Apply new allocations to sales
    let totalAllocated = 0;
    payment.sales = [];

    if (sales && sales.length > 0) {
      for (let allocation of sales) {
        const sale = await Sale.findById(allocation.sale);
        if (!sale) {
          return res.status(404).json({
            success: false,
            message: `Sale not found: ${allocation.sale}`
          });
        }

        const allocationAmount = parseFloat(allocation.amount);
        payment.sales.push({
          sale: allocation.sale,
          amount: allocationAmount
        });

        totalAllocated += allocationAmount;

        // Store old balance before updating
        const oldBalance = sale.balance;

        // Apply new payment
        sale.paid += allocationAmount;
        sale.balance -= allocationAmount;
        
        // Update payment status
        if (sale.balance < -0.01) {
          sale.paymentStatus = 'overpaid';
        } else if (Math.abs(sale.balance) < 0.01) {
          sale.paymentStatus = 'paid';
        } else if (sale.paid > 0) {
          sale.paymentStatus = 'partial';
        } else {
          sale.paymentStatus = 'pending';
        }
        
        await sale.save();

        // Update customer outstanding based on balance change
        const balanceChange = sale.balance - oldBalance;
        await Customer.findByIdAndUpdate(sale.customer, {
          $inc: { outstandingAmount: balanceChange }
        });
      }
    }

    payment.totalAllocated = totalAllocated;
    await payment.save();

    await payment.populate('customer', 'name phone email');
    await payment.populate('createdBy', 'name email');
    await payment.populate('sales.sale', 'invoiceNumber total');

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during payment update'
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private
const getPaymentStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const totalPayments = await Payment.countDocuments();
    const todayPayments = await Payment.countDocuments({
      paymentDate: { $gte: startOfDay, $lt: endOfDay }
    });

    const totalAmount = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const todayAmount = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfDay, $lt: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paymentsByMethod = await Payment.aggregate([
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalPayments,
        todayPayments,
        totalAmount: totalAmount[0]?.total || 0,
        todayAmount: todayAmount[0]?.total || 0,
        paymentsByMethod
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get pending payments for a customer
// @route   GET /api/payments/pending/:customerId
// @access  Private
const getPendingPayments = async (req, res) => {
  try {
    const sales = await Sale.find({
      customer: req.params.customerId,
      status: 'completed',
      balance: { $gt: 0 }
    })
    .select('invoiceNumber total paid balance createdAt')
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: { sales }
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get unallocated payments for a customer
// @route   GET /api/payments/unallocated/:customerId
// @access  Private
const getUnallocatedPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      customer: req.params.customerId
    })
    .select('receiptNumber amount totalAllocated remainingAmount paymentMethod paymentDate')
    .sort({ paymentDate: -1 });

    // Filter payments that have remaining amount
    const unallocatedPayments = payments.filter(p => p.remainingAmount > 0);

    res.json({
      success: true,
      data: { payments: unallocatedPayments }
    });
  } catch (error) {
    console.error('Get unallocated payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  getPaymentStats,
  getPendingPayments,
  getUnallocatedPayments
};
