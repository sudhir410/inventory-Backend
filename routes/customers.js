const express = require('express');
const { body } = require('express-validator');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation rules for creating customer (only name is required)
const createCustomerValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      // Only validate if provided and not empty
      if (value && value.length > 0 && (value.length < 10 || value.length > 20)) {
        throw new Error('Phone number must be between 10 and 20 characters');
      }
      return true;
    }),
  body('type')
    .optional({ checkFalsy: true })
    .isIn(['retail', 'wholesale', 'business'])
    .withMessage('Customer type must be retail, wholesale, or business'),
  body('gstNumber')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Only validate format if provided
      if (value && value.trim()) {
        if (value.length !== 15) {
          throw new Error('GST number must be 15 characters long');
        }
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
          throw new Error('Please provide a valid GST number');
        }
      }
      return true;
    }),
  body('panNumber')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Only validate format if provided
      if (value && value.trim()) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          throw new Error('Please provide a valid PAN number');
        }
      }
      return true;
    }),
  body('creditLimit')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Only validate if provided
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Credit limit must be a non-negative number');
        }
      }
      return true;
    })
];

// Validation rules for updating customer (only name is required if provided)
const updateCustomerValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      // Only validate if provided and not empty
      if (value && value.length > 0 && (value.length < 10 || value.length > 20)) {
        throw new Error('Phone number must be between 10 and 20 characters');
      }
      return true;
    }),
  body('type')
    .optional({ checkFalsy: true })
    .isIn(['retail', 'wholesale', 'business'])
    .withMessage('Customer type must be retail, wholesale, or business'),
  body('gstNumber')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Only validate format if provided
      if (value && value.trim()) {
        if (value.length !== 15) {
          throw new Error('GST number must be 15 characters long');
        }
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
          throw new Error('Please provide a valid GST number');
        }
      }
      return true;
    }),
  body('panNumber')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Only validate format if provided
      if (value && value.trim()) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          throw new Error('Please provide a valid PAN number');
        }
      }
      return true;
    }),
  body('creditLimit')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Only validate if provided
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          throw new Error('Credit limit must be a non-negative number');
        }
      }
      return true;
    })
];

// Routes
router.route('/')
  .get(getCustomers)
  .post(createCustomerValidation, createCustomer);

router.route('/stats')
  .get(getCustomerStats);

router.route('/:id')
  .get(getCustomer)
  .put(updateCustomerValidation, updateCustomer)
  .delete(authorize('admin', 'manager'), deleteCustomer);

module.exports = router;
