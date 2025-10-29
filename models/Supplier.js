const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add supplier name'],
    trim: true,
    maxlength: [100, 'Supplier name cannot be more than 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
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
  contactPerson: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact person name cannot be more than 100 characters']
  },
  paymentTerms: {
    type: String,
    enum: ['cash', '15_days', '30_days', '45_days', '60_days', '90_days'],
    default: '30_days'
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  outstandingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Outstanding amount cannot be negative']
  },
  totalPurchase: {
    type: Number,
    default: 0,
    min: [0, 'Total purchase cannot be negative']
  },
  lastPurchase: {
    type: Date
  },
  website: {
    type: String,
    match: [
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      'Please add a valid website URL'
    ]
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
supplierSchema.virtual('fullAddress').get(function() {
  if (this.address) {
    return `${this.address.street || ''} ${this.address.city || ''} ${this.address.state || ''} ${this.address.zipCode || ''}`.trim();
  }
  return '';
});

// Index for better search performance
supplierSchema.index({ name: 'text', email: 'text', phone: 'text' });
supplierSchema.index({ phone: 1 });
supplierSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
