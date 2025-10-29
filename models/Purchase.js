const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Please add invoice number'],
    unique: true,
    uppercase: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Please add supplier']
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: [true, 'Please add quantity'],
      min: [0.01, 'Quantity must be greater than 0']
    },
    price: {
      type: Number,
      required: [true, 'Please add price'],
      min: [0, 'Price cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  paid: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'credit', 'cheque'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'pending'
  },
  dueDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
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

// Index for better performance
purchaseSchema.index({ invoiceNumber: 1 });
purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
