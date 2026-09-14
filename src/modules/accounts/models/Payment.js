import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    trim: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  method: {
    type: String,
    enum: ['cash', 'online', 'card', 'upi', 'bank_transfer', 'cheque'],
    required: [true, 'Payment method is required']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentDetails: {
    utrNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    chequeNumber: { type: String, trim: true },
    cardLast4: { type: String, trim: true },
    cardType: { type: String, enum: ['visa', 'mastercard', 'amex', 'rupay', 'other'], trim: true },
    upiId: { type: String, trim: true },
    gateway: { type: String, trim: true },
    gatewayTransactionId: { type: String, trim: true }
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Accountant', default: null },
    verifiedAt: { type: Date, default: null },
    verificationNotes: { type: String, trim: true },
    verificationMethod: {
      type: String,
      enum: ['manual', 'bank_statement', 'gateway_verification', 'receipt_verification'],
      default: 'manual'
    }
  },
  receipt: {
    receiptNumber: { type: String, trim: true },
    receiptDate: { type: Date, default: Date.now },
    receiptAmount: { type: Number, min: [0, 'Receipt amount cannot be negative'] },
    receiptNotes: { type: String, trim: true },
    receiptImage: { type: String, default: null }
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'collectedByModel',
    default: null
  },
  collectedByModel: {
    type: String,
    enum: ['Driver', 'Salesman', 'Logistics', 'Accountant'],
    default: null
  },
  collectedAt: {
    type: Date,
    default: Date.now
  },
  collectedLocation: {
    type: String,
    trim: true
  },
  customerDetails: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'lastModifiedByModel',
    default: null
  },
  lastModifiedByModel: {
    type: String,
    enum: ['Admin', 'Salesman', 'Logistics', 'Driver', 'Accountant'],
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
paymentSchema.virtual('isVerified').get(function() {
  return this.verification.isVerified;
});

paymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

paymentSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

paymentSchema.virtual('daysSincePayment').get(function() {
  return Math.floor((Date.now() - this.collectedAt) / (1000 * 60 * 60 * 24));
});

// Indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ collectedAt: -1 });
paymentSchema.index({ 'verification.isVerified': 1 });

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  if (!this.receipt.receiptNumber && this.status === 'completed') {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.receipt.receiptNumber = `RCP${timestamp}${random}`;
  }
  
  if (!this.receipt.receiptAmount && this.amount) {
    this.receipt.receiptAmount = this.amount;
  }
  
  next();
});

paymentSchema.statics.findByOrderId = function(orderId) {
  return this.find({ orderId }).sort({ collectedAt: -1 });
};

paymentSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId });
};

paymentSchema.statics.findPending = function() {
  return this.find({ status: 'pending' });
};

paymentSchema.statics.findUnverified = function() {
  return this.find({ 'verification.isVerified': false, status: 'completed' });
};

paymentSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
        },
        verifiedPayments: {
          $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] }
        },
        unverifiedPayments: {
          $sum: { $cond: [{ $eq: ['$verification.isVerified', false] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalPayments: 0,
    totalAmount: 0,
    completedPayments: 0,
    completedAmount: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    verifiedPayments: 0,
    unverifiedPayments: 0
  };
};

paymentSchema.statics.getMethodStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
  
  return stats;
};

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
