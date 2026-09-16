import mongoose from 'mongoose';

const warrantySchema = new mongoose.Schema({
  warrantyNumber: {
    type: String,
    required: [true, 'Warranty number is required'],
    unique: true,
    trim: true,
    index: true,
  },
  orderNumber: {
    type: String,
    trim: true,
    default: null,
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  state: {
    type: String,
    trim: true,
    default: '',
  },
  product: {
    type: String,
    required: [true, 'Product is required'],
    trim: true,
  },
  variety: {
    type: String,
    trim: true,
    default: 'Standard Collection',
  },
  sizeType: {
    type: String,
    enum: ['standard', 'custom', 'customized'],
    default: 'standard',
  },
  length: {
    type: String,
    trim: true,
    default: '',
  },
  breadth: {
    type: String,
    trim: true,
    default: '',
  },
  height: {
    type: String,
    trim: true,
    default: '',
  },
  customLength: {
    type: String,
    trim: true,
    default: '',
  },
  customBreadth: {
    type: String,
    trim: true,
    default: '',
  },
  customHeight: {
    type: String,
    trim: true,
    default: '',
  },
  totalQuantity: {
    type: String,
    trim: true,
    default: '1',
  },
  purchaseFrom: {
    type: String,
    trim: true,
    default: 'Direct',
  },
  selectedStore: {
    type: String,
    trim: true,
    default: '',
  },
  dealerName: {
    type: String,
    trim: true,
    default: '',
  },
  invoiceDate: {
    type: String,
    trim: true,
    default: () => new Date().toLocaleDateString('en-IN'),
  },
  warrantyPeriod: {
    type: String,
    trim: true,
    default: '5 Years Comprehensive',
  },
  syncStatus: {
    googleSheet: {
      status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending',
      },
      syncedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },
    pdf: {
      status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending',
      },
      generatedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },
  },
  rawFormData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for fast lookup
warrantySchema.index({ mobileNumber: 1 });
warrantySchema.index({ createdAt: -1 });

const Warranty = mongoose.model('Warranty', warrantySchema);

export default Warranty;
