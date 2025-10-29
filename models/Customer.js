const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add customer name'],
    trim: true,
    maxlength: [100, 'Customer name cannot be more than 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Only validate if email is provided
        if (!v || v.trim() === '') return true;
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please add a valid email'
    }
  },
  phone: {
    type: String,
    required: false,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  type: {
    type: String,
    enum: ['retail', 'wholesale', 'business'],
    default: 'retail'
  },
  gstNumber: {
    type: String,
    uppercase: true,
    maxlength: [15, 'GST number cannot be more than 15 characters']
  },
  panNumber: {
    type: String,
    uppercase: true,
    maxlength: [10, 'PAN number cannot be more than 10 characters']
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  outstandingAmount: {
    type: Number,
    default: 0
    // No min validation - can be negative when customer has overpaid (credit)
  },
  totalPurchase: {
    type: Number,
    default: 0,
    min: [0, 'Total purchase cannot be negative']
  },
  lastPurchase: {
    type: Date
  },
  dateOfBirth: {
    type: Date
  },
  anniversary: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
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

// Virtual for full address
customerSchema.virtual('fullAddress').get(function() {
  if (this.address) {
    return `${this.address.street || ''} ${this.address.city || ''} ${this.address.state || ''} ${this.address.zipCode || ''}`.trim();
  }
  return '';
});

// Virtual for credit status
customerSchema.virtual('creditStatus').get(function() {
  if (this.outstandingAmount <= 0) return 'Clear';
  if (this.creditLimit > 0 && this.outstandingAmount > this.creditLimit) return 'Over Limit';
  return 'Within Limit';
});

// Index for better search performance
customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ phone: 1 });
customerSchema.index({ 'address.city': 1 });
customerSchema.index({ outstandingAmount: -1 });

module.exports = mongoose.model('Customer', customerSchema);
