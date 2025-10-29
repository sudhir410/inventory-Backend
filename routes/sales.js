const express = require('express');
const { body } = require('express-validator');
const {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  getSalesStats
} = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation rules for creating sale
const createSaleValidation = [
  body('customer')
    .isMongoId()
    .withMessage('Please provide a valid customer ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Please provide a valid product ID'),
  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('items.*.discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a non-negative number'),
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a non-negative number'),
  body('tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax must be a non-negative number'),
  body('paid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a non-negative number'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'credit', 'cheque'])
    .withMessage('Invalid payment method')
];

// Validation rules for updating sale
const updateSaleValidation = [
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid customer ID'),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.product')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid product ID'),
  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('items.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('items.*.discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a non-negative number'),
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a non-negative number'),
  body('tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax must be a non-negative number'),
  body('paid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a non-negative number'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'credit', 'cheque'])
    .withMessage('Invalid payment method')
];

// Routes
router.route('/')
  .get(getSales)
  .post(createSaleValidation, createSale);

router.route('/stats')
  .get(getSalesStats);

router.route('/:id')
  .get(getSale)
  .put(authorize('admin', 'manager'), updateSaleValidation, updateSale)
  .delete(authorize('admin', 'manager'), deleteSale);

module.exports = router;
