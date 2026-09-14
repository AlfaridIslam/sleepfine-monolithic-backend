import mongoose from 'mongoose';

const storeInvoiceSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: false, // Auto-generated in pre-save middleware
    unique: true,
    trim: true
  },
  salesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
    required: [true, 'Salesman is required']
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    }
  },
  items: [{
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate must be non-negative']
    },
    total: {
      type: Number,
      default: 0
    }
  }],
  payment: {
    method: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Cheque'],
      required: [true, 'Payment method is required']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be non-negative']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    },
    collectedAt: {
      type: Date,
      default: Date.now
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salesman'
    }
  },
  totals: {
    subtotal: {
      type: Number,
      required: true
    },
    gst: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    }
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'large'],
    default: 'large'
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'confirmed'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
storeInvoiceSchema.index({ salesman: 1 });
storeInvoiceSchema.index({ 'customer.name': 1 });
storeInvoiceSchema.index({ 'payment.status': 1 });
storeInvoiceSchema.index({ status: 1 });
storeInvoiceSchema.index({ createdAt: -1 });

// Virtual for total amount
storeInvoiceSchema.virtual('totalAmount').get(function() {
  return this.totals?.total || 0;
});

// Pre-save middleware to generate receipt number and calculate totals
storeInvoiceSchema.pre('save', function(next) {
  // Generate receipt number if not provided
  if (!this.receiptNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    this.receiptNumber = `SI-${year}${month}${day}-${timestamp}`;
  }

  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.total = item.quantity * item.rate;
    });
    
    const subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    const gstRate = this.totals?.gst !== undefined ? this.totals.gst : 18;
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;
    
    if (!this.totals) {
      this.totals = {};
    }
    this.totals.subtotal = subtotal;
    this.totals.gst = gstAmount;
    this.totals.total = total;
  }
  next();
});

// Static method to get statistics
storeInvoiceSchema.statics.getStats = async function(filters = {}) {
  try {
    const matchQuery = {};
    
    if (filters.salesmanId) {
      matchQuery.salesman = new mongoose.Types.ObjectId(filters.salesmanId);
    }
    
    if (filters.startDate && filters.endDate) {
      matchQuery.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    if (filters.status) {
      matchQuery.status = filters.status;
    }
    
    const stats = await this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$totals.total' },
          totalCollected: {
            $sum: {
              $cond: [
                { $eq: ['$payment.status', 'completed'] },
                '$payment.amount',
                0
              ]
            }
          },
          totalPending: {
            $sum: {
              $cond: [
                { $eq: ['$payment.status', 'pending'] },
                '$payment.amount',
                0
              ]
            }
          },
          averageOrderValue: { $avg: '$totals.total' }
        }
      }
    ]);
    
    return stats[0] || {
      totalInvoices: 0,
      totalRevenue: 0,
      totalCollected: 0,
      totalPending: 0,
      averageOrderValue: 0
    };
  } catch (error) {
    throw error;
  }
};

// Static method to get payment method distribution
storeInvoiceSchema.statics.getPaymentMethodStats = async function(filters = {}) {
  try {
    const matchQuery = {};
    
    if (filters.salesmanId) {
      matchQuery.salesman = new mongoose.Types.ObjectId(filters.salesmanId);
    }
    
    if (filters.startDate && filters.endDate) {
      matchQuery.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    const stats = await this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$payment.amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    
    return stats;
  } catch (error) {
    throw error;
  }
};

// Static method to get daily stats
storeInvoiceSchema.statics.getDailyStats = async function(filters = {}) {
  try {
    const matchQuery = {};
    
    if (filters.salesmanId) {
      matchQuery.salesman = new mongoose.Types.ObjectId(filters.salesmanId);
    }
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [todayStats, weekStats, monthStats] = await Promise.all([
      this.getStats({ ...filters, startDate: startOfDay, endDate: new Date() }),
      this.getStats({ ...filters, startDate: startOfWeek, endDate: new Date() }),
      this.getStats({ ...filters, startDate: startOfMonth, endDate: new Date() })
    ]);
    
    return {
      today: todayStats,
      thisWeek: weekStats,
      thisMonth: monthStats
    };
  } catch (error) {
    throw error;
  }
};

const StoreInvoice = mongoose.model('StoreInvoice', storeInvoiceSchema);

export default StoreInvoice;
