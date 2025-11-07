const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: [true, 'Please add receipt number'],
    unique: true,
    uppercase: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Please add customer']
  },
  amount: {
    type: Number,
    required: [true, 'Please add payment amount'],
    min: [0.01, 'Payment amount must be greater than 0']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'adjustment'],
    required: [true, 'Please add payment method']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  reference: {
    type: String, // cheque number, transaction ID, etc.
    maxlength: [50, 'Reference cannot be more than 50 characters']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  sales: [{
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale'
    },
    amount: {
      type: Number,
      min: [0, 'Amount cannot be negative']
    }
  }],
  totalAllocated: {
    type: Number,
    default: 0,
    min: [0, 'Total allocated cannot be negative']
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

// Virtual for remaining unallocated amount
paymentSchema.virtual('remainingAmount').get(function() {
  return this.amount - this.totalAllocated;
});

// Index for better performance
// Note: receiptNumber already has unique index from field definition
paymentSchema.index({ customer: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
