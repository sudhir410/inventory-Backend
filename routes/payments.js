const express = require('express');
const { body } = require('express-validator');
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  getPaymentStats,
  getPendingPayments,
  getUnallocatedPayments
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation rules for creating payment
const createPaymentValidation = [
  body('customer')
    .isMongoId()
    .withMessage('Please provide a valid customer ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'adjustment'])
    .withMessage('Invalid payment method'),
  body('sales')
    .optional()
    .isArray()
    .withMessage('Sales must be an array'),
  body('sales.*.sale')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid sale ID'),
  body('sales.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Allocation amount must be a non-negative number')
];

// Validation rules for updating payment
const updatePaymentValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'adjustment'])
    .withMessage('Invalid payment method'),
  body('sales')
    .optional()
    .isArray()
    .withMessage('Sales must be an array'),
  body('sales.*.sale')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid sale ID'),
  body('sales.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Allocation amount must be a non-negative number')
];

// Routes
router.route('/')
  .get(getPayments)
  .post(createPaymentValidation, createPayment);

router.route('/stats')
  .get(getPaymentStats);

router.route('/pending/:customerId')
  .get(getPendingPayments);

router.route('/unallocated/:customerId')
  .get(getUnallocatedPayments);

router.route('/:id')
  .get(getPayment)
  .put(updatePaymentValidation, updatePayment);

module.exports = router;
