const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getCategories,
  getLowStock
} = require('../controllers/productController');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation rules for creating product (all fields optional)
const createProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product name cannot be more than 100 characters'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SKU cannot be more than 50 characters')
    .custom((value) => {
      // Only validate alphanumeric if SKU is provided
      if (value && !/^[A-Z0-9-]+$/i.test(value)) {
        throw new Error('SKU must contain only letters, numbers, and hyphens');
      }
      return true;
    }),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot be more than 50 characters'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand cannot be more than 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('unit')
    .optional()
    .isIn(['piece', 'kg', 'meter', 'liter', 'box', 'packet', 'set', 'pair'])
    .withMessage('Invalid unit'),
  body('price.purchase')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number'),
  body('price.selling')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('price.mrp')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('MRP must be a positive number'),
  body('stock.current')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative integer'),
  body('stock.minimum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative integer'),
  body('stock.maximum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative integer'),
  body('supplier')
    .optional()
    .custom((value) => {
      // Allow empty string or null
      if (!value || value === '') return true;
      // Only validate format if a value is provided
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Location cannot be more than 50 characters'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Barcode cannot be more than 50 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation rules for updating product (all fields optional)
const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product name cannot be more than 100 characters'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SKU cannot be more than 50 characters')
    .custom((value) => {
      // Only validate alphanumeric if SKU is provided
      if (value && !/^[A-Z0-9-]+$/i.test(value)) {
        throw new Error('SKU must contain only letters, numbers, and hyphens');
      }
      return true;
    }),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot be more than 50 characters'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand cannot be more than 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('unit')
    .optional()
    .isIn(['piece', 'kg', 'meter', 'liter', 'box', 'packet', 'set', 'pair'])
    .withMessage('Invalid unit'),
  body('price.purchase')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number'),
  body('price.selling')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('price.mrp')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('MRP must be a positive number'),
  body('stock.current')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative integer'),
  body('stock.minimum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative integer'),
  body('stock.maximum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative integer'),
  body('supplier')
    .optional()
    .custom((value) => {
      // Allow empty string or null
      if (!value || value === '') return true;
      // Only validate format if a value is provided
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Location cannot be more than 50 characters'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Barcode cannot be more than 50 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation rules for stock update
const stockUpdateValidation = [
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('operation')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operation must be add, subtract, or set')
];

// Routes
router.route('/products')
  .get(getProducts)
  .post(createProductValidation, createProduct);

router.route('/products/categories')
  .get(getCategories);

router.route('/products/low-stock')
  .get(getLowStock);

router.route('/products/:id')
  .get(getProduct)
  .put(updateProductValidation, updateProduct)
  .delete(authorize('admin', 'manager'), deleteProduct);

router.route('/products/:id/stock')
  .put(stockUpdateValidation, updateStock);

module.exports = router;
