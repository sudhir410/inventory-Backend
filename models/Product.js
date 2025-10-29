const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true, // Allow null values for unique index
    uppercase: true,
    required: false
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true,
    maxlength: [50, 'Category cannot be more than 50 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  unit: {
    type: String,
    required: [true, 'Please add a unit'],
    trim: true,
    default: 'piece'
  },
  price: {
    purchase: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'Purchase price cannot be negative']
    },
    selling: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'Selling price cannot be negative']
    },
    mrp: {
      type: Number,
      required: false,
      min: [0, 'MRP cannot be negative']
    }
  },
  stock: {
    current: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    minimum: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock cannot be negative']
    },
    maximum: {
      type: Number,
      min: [0, 'Maximum stock cannot be negative']
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [50, 'Location cannot be more than 50 characters']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  image: {
    type: String // URL or path to product image
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to handle empty strings for ObjectId fields
productSchema.pre('save', function(next) {
  // Convert empty string supplier to undefined so Mongoose doesn't try to cast it
  if (this.supplier === '' || this.supplier === null) {
    this.supplier = undefined;
  }
  next();
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.price.purchase && this.price.selling) {
    return ((this.price.selling - this.price.purchase) / this.price.purchase * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock.current <= 0) return 'Out of Stock';
  if (this.stock.current <= this.stock.minimum) return 'Low Stock';
  if (this.stock.maximum && this.stock.current >= this.stock.maximum) return 'Over Stock';
  return 'In Stock';
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text', category: 'text' });
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ 'stock.current': 1 });

module.exports = mongoose.model('Product', productSchema);
