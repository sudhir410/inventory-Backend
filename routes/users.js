const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin and manager can access all user routes
router.use(authorize('admin', 'manager'));

// Validation rules
const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Role must be admin, manager, or employee'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot be more than 20 characters')
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Role must be admin, manager, or employee'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot be more than 20 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Routes
router.route('/')
  .get(getUsers)
  .post(createUserValidation, createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUserValidation, updateUser)
  .delete(deleteUser);

module.exports = router;
