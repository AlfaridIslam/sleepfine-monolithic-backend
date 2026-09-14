import mongoose from 'mongoose';

const gatepassSchema = new mongoose.Schema({
  gatepassId: {
    type: String,
    required: [true, 'Gatepass ID is required'],
    unique: true,
    trim: true
  },
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    trim: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required']
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Logistics',
    required: [true, 'Issuer is required']
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled'],
    default: 'active'
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },
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
    specifications: {
      type: Map,
      of: String,
      default: {}
    }
  }],
  deliveryDetails: {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    vehicleNumber: {
      type: String,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'truck', 'van', 'other'],
      trim: true
    },
    deliveryAddress: {
      street: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      zipCode: {
        type: String,
        trim: true
      },
      landmarks: {
        type: String,
        trim: true
      }
    },
    scheduledDeliveryDate: {
      type: Date,
      default: null
    },
    actualDeliveryDate: {
      type: Date,
      default: null
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'in_transit', 'delivered', 'failed', 'returned'],
      default: 'pending'
    }
  },
  paymentDetails: {
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    advanceAmount: {
      type: Number,
      default: 0,
      min: [0, 'Advance amount cannot be negative']
    },
    pendingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Pending amount cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online', 'card', 'upi', 'bank_transfer'],
      default: 'cash'
    }
  },
  security: {
    securityCheck: {
      type: Boolean,
      default: false
    },
    securityOfficer: {
      type: String,
      trim: true
    },
    checkInTime: {
      type: Date,
      default: null
    },
    checkOutTime: {
      type: Date,
      default: null
    },
    securityNotes: {
      type: String,
      trim: true
    }
  },
  qualityCheck: {
    isChecked: {
      type: Boolean,
      default: false
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logistics',
      default: null
    },
    checkedAt: {
      type: Date,
      default: null
    },
    qualityStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'conditional'],
      default: 'pending'
    },
    qualityNotes: {
      type: String,
      trim: true
    }
  },
  packaging: {
    isPackaged: {
      type: Boolean,
      default: false
    },
    packagedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logistics',
      default: null
    },
    packagedAt: {
      type: Date,
      default: null
    },
    packagingType: {
      type: String,
      enum: ['standard', 'fragile', 'bulk', 'custom'],
      default: 'standard'
    },
    packagingNotes: {
      type: String,
      trim: true
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative']
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, 'Length cannot be negative']
      },
      width: {
        type: Number,
        min: [0, 'Width cannot be negative']
      },
      height: {
        type: Number,
        min: [0, 'Height cannot be negative']
      }
    }
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
    enum: ['Admin', 'Salesman', 'Logistics', 'Driver', 'Accounts'],
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
gatepassSchema.virtual('isValid').get(function() {
  return this.status === 'active' && this.validUntil > new Date();
});

gatepassSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date();
});

gatepassSchema.virtual('isUsed').get(function() {
  return this.status === 'used';
});

gatepassSchema.virtual('daysUntilExpiry').get(function() {
  return Math.ceil((this.validUntil - new Date()) / (1000 * 60 * 60 * 24));
});

// Indexes
gatepassSchema.index({ orderId: 1 });
gatepassSchema.index({ order: 1 });
gatepassSchema.index({ status: 1 });
gatepassSchema.index({ issuedBy: 1 });
gatepassSchema.index({ issuedAt: -1 });
gatepassSchema.index({ validUntil: 1 });
gatepassSchema.index({ 'deliveryDetails.driver': 1 });
gatepassSchema.index({ 'deliveryDetails.deliveryStatus': 1 });
gatepassSchema.index({ 'paymentDetails.paymentStatus': 1 });
gatepassSchema.index({ 'qualityCheck.qualityStatus': 1 });

// Pre-save middleware
gatepassSchema.pre('save', function(next) {
  // Calculate pending amount
  this.paymentDetails.pendingAmount = this.paymentDetails.totalAmount - this.paymentDetails.advanceAmount;
  
  // Auto-update status based on expiry
  if (this.validUntil < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  // Auto-update payment status
  if (this.paymentDetails.pendingAmount === 0) {
    this.paymentDetails.paymentStatus = 'completed';
  } else if (this.paymentDetails.advanceAmount > 0) {
    this.paymentDetails.paymentStatus = 'partial';
  }
  
  next();
});

// Static methods
gatepassSchema.statics.findByGatepassId = function(gatepassId) {
  return this.findOne({ gatepassId });
};

gatepassSchema.statics.findByOrderId = function(orderId) {
  return this.find({ orderId }).sort({ issuedAt: -1 });
};

gatepassSchema.statics.findActive = function() {
  return this.find({ status: 'active', validUntil: { $gt: new Date() } });
};

gatepassSchema.statics.findExpired = function() {
  return this.find({ validUntil: { $lt: new Date() }, status: 'active' });
};

gatepassSchema.statics.findByDriver = function(driverId) {
  return this.find({ 'deliveryDetails.driver': driverId });
};

gatepassSchema.statics.findByIssuer = function(issuerId) {
  return this.find({ issuedBy: issuerId });
};

gatepassSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalGatepasses: { $sum: 1 },
        activeGatepasses: {
          $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $gt: ['$validUntil', new Date()] }] }, 1, 0] }
        },
        expiredGatepasses: {
          $sum: { $cond: [{ $lt: ['$validUntil', new Date()] }, 1, 0] }
        },
        usedGatepasses: {
          $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
        },
        totalAmount: { $sum: '$paymentDetails.totalAmount' },
        pendingAmount: { $sum: '$paymentDetails.pendingAmount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalGatepasses: 0,
    activeGatepasses: 0,
    expiredGatepasses: 0,
    usedGatepasses: 0,
    totalAmount: 0,
    pendingAmount: 0
  };
};

const Gatepass = mongoose.model('Gatepass', gatepassSchema);
export default Gatepass;
