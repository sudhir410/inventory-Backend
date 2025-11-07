const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Please add invoice number'],
    unique: true,
    uppercase: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Please add customer']
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
    default: 0
    // Removed min validation to allow negative balance (overpayment/advance)
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'credit', 'cheque'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending', 'overpaid'],
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

// Virtual for remaining balance
saleSchema.virtual('remainingBalance').get(function() {
  return this.total - this.paid;
});

// Update customer outstanding amount when sale is saved
saleSchema.post('save', async function() {
  if (this.status === 'completed' && this.balance > 0) {
    await mongoose.model('Customer').findByIdAndUpdate(
      this.customer,
      {
        $inc: { outstandingAmount: this.balance },
        lastPurchase: new Date()
      }
    );
  }
});

// Index for better performance
// Note: invoiceNumber already has unique index from field definition
saleSchema.index({ customer: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Sale', saleSchema);
