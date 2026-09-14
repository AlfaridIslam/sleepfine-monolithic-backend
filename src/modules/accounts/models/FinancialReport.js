import mongoose from 'mongoose';

const financialReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: [true, 'Report ID is required'],
    unique: true,
    trim: true
  },
  reportType: {
    type: String,
    enum: [
      'profit_loss', 'balance_sheet', 'cash_flow', 'accounts_receivable', 
      'accounts_payable', 'sales_report', 'payment_report', 'tax_report',
      'expense_report', 'inventory_valuation', 'trial_balance', 'custom'
    ],
    required: [true, 'Report type is required']
  },
  reportName: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true,
    maxlength: [200, 'Report name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  reportPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    required: [true, 'Report period is required']
  },
  dateRange: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    }
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'archived'],
    default: 'completed'
  },
  data: {
    summary: {
      totalRevenue: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      netProfit: { type: Number, default: 0 },
      grossMargin: { type: Number, default: 0 },
      netMargin: { type: Number, default: 0 }
    },
    salesData: {
      totalSales: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 }
    },
    paymentData: {
      totalCollected: { type: Number, default: 0 },
      totalPending: { type: Number, default: 0 },
      collectionEfficiency: { type: Number, default: 0 }
    },
    taxData: {
      totalTaxCollected: { type: Number, default: 0 },
      cgstCollected: { type: Number, default: 0 },
      sgstCollected: { type: Number, default: 0 },
      igstCollected: { type: Number, default: 0 }
    }
  },
  filters: {
    departments: [String],
    regions: [String],
    products: [String],
    customers: [String],
    salesmen: [String],
    paymentMethods: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    default: null
  },
  createdByModel: {
    type: String,
    enum: ['Admin', 'Accountant'],
    default: 'Admin'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

financialReportSchema.index({ reportType: 1 });
financialReportSchema.index({ createdAt: -1 });

financialReportSchema.pre('save', function(next) {
  if (!this.reportId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.reportId = `REP${timestamp}${random}`;
  }
  next();
});

const FinancialReport = mongoose.model('FinancialReport', financialReportSchema);
export default FinancialReport;
