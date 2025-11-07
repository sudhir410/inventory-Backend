const { validationResult } = require('express-validator');
const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/inventory/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by stock status
    if (req.query.stockStatus) {
      if (req.query.stockStatus === 'low') {
        query.$expr = { $lte: ['$stock.current', '$stock.minimum'] };
      } else if (req.query.stockStatus === 'out') {
        query['stock.current'] = 0;
      }
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Search by name, description, or category
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const products = await Product.find(query)
      .populate('supplier', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single product
// @route   GET /api/inventory/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplier', 'name email phone address')
      .populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create product
// @route   POST /api/inventory/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Sanitize data - convert empty strings to undefined for ObjectId fields
    const productData = {
      ...req.body,
      createdBy: req.user._id
    };
    
    // Handle empty supplier field
    if (productData.supplier === '' || productData.supplier === null) {
      delete productData.supplier;
    }

    const product = await Product.create(productData);

    await product.populate('supplier', 'name phone');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }
    
    // Return detailed error in development
    res.status(500).json({
      success: false,
      message: 'Server error during product creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// @desc    Update product
// @route   PUT /api/inventory/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update product fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        // Handle empty supplier field
        if (key === 'supplier' && (req.body[key] === '' || req.body[key] === null)) {
          product[key] = undefined;
        } else if (key === 'price' || key === 'stock') {
          // Handle nested objects - merge instead of replace
          product[key] = {
            ...product[key].toObject(),
            ...req.body[key]
          };
        } else {
          product[key] = req.body[key];
        }
      }
    });

    await product.save();
    await product.populate('supplier', 'name phone');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }
    
    // Return detailed error in development
    res.status(500).json({
      success: false,
      message: 'Server error during product update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/inventory/products/:id
// @access  Private/Admin/Manager
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during product deletion'
    });
  }
};

// @desc    Update product stock
// @route   PUT /api/inventory/products/:id/stock
// @access  Private
const updateStock = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { quantity, operation } = req.body; // operation: 'add', 'subtract', 'set'

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let newStock;
    switch (operation) {
      case 'add':
        newStock = product.stock.current + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, product.stock.current - quantity);
        break;
      case 'set':
        newStock = Math.max(0, quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Use add, subtract, or set.'
        });
    }

    product.stock.current = newStock;
    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          stockStatus: product.stockStatus
        }
      }
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during stock update'
    });
  }
};

// @desc    Get product categories
// @route   GET /api/inventory/products/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/inventory/products/low-stock
// @access  Private
const getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock.current', '$stock.minimum'] },
      isActive: true
    })
    .select('name sku category stock')
    .sort({ 'stock.current': 1 });

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getCategories,
  getLowStock
};
