import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
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
      required: [true, 'Customer phone is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      street: {
        type: String,
        required: [true, 'Customer street address is required'],
        trim: true
      },
      city: {
        type: String,
        required: [true, 'Customer city is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'Customer state is required'],
        trim: true
      },
      zipCode: {
        type: String,
        required: [true, 'Customer ZIP code is required'],
        trim: true
      }
    }
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
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
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative']
    },
    specifications: {
      type: Map,
      of: String,
      default: {}
    }
  }],
  orderDetails: {
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
    deliveryCharges: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charges cannot be negative']
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'online', 'card', 'upi', 'bank_transfer'],
      default: 'cash'
    },
    transactions: [{
      amount: {
        type: Number,
        required: [true, 'Transaction amount is required']
      },
      method: {
        type: String,
        enum: ['cash', 'online', 'card', 'upi', 'bank_transfer'],
        required: [true, 'Payment method is required']
      },
      transactionId: {
        type: String,
        trim: true
      },
      utrNumber: {
        type: String,
        trim: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      notes: {
        type: String,
        trim: true
      }
    }]
  },
  delivery: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'out_for_delivery', 'delivered', 'failed', 'returned'],
      default: 'pending'
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    gatepass: {
      gatepassId: {
        type: String,
        trim: true
      },
      issuedAt: {
        type: Date,
        default: null
      },
      issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Logistics',
        default: null
      }
    },
    scheduledDate: {
      type: Date,
      default: null
    },
    actualDeliveryDate: {
      type: Date,
      default: null
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
    deliveryNotes: {
      type: String,
      trim: true
    },
    signature: {
      type: String,
      default: null
    }
  },
  manufacturing: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'quality_check', 'packaged'],
      default: 'pending'
    },
    startDate: {
      type: Date,
      default: null
    },
    completionDate: {
      type: Date,
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logistics',
      default: null
    },
    notes: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['whatsapp', 'phone', 'email', 'walk_in', 'online'],
    default: 'whatsapp'
  },
  whatsappGroup: {
    type: String,
    trim: true
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
orderSchema.virtual('isFullyPaid').get(function() {
  return this.orderDetails.pendingAmount === 0;
});

orderSchema.virtual('isDelivered').get(function() {
  return this.delivery.status === 'delivered';
});

orderSchema.virtual('isCompleted').get(function() {
  return this.status === 'delivered' && this.isFullyPaid;
});

orderSchema.virtual('daysSinceCreation').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Indexes
orderSchema.index({ salesman: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'delivery.status': 1 });
orderSchema.index({ 'manufacturing.status': 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware
orderSchema.pre('save', function(next) {
  this.orderDetails.pendingAmount = this.orderDetails.totalAmount - (this.orderDetails.advanceAmount || 0);
  
  if (this.isModified('payment.status') || this.isModified('delivery.status')) {
    if (this.delivery.status === 'delivered' && this.payment.status === 'completed') {
      this.status = 'delivered';
    } else if (this.delivery.status === 'out_for_delivery') {
      this.status = 'out_for_delivery';
    } else if (this.manufacturing.status === 'packaged') {
      this.status = 'ready';
    }
  }
  
  next();
});

orderSchema.statics.findByOrderId = function(orderId) {
  return this.findOne({ orderId });
};

orderSchema.statics.findBySalesman = function(salesmanId) {
  return this.find({ salesman: salesmanId }).sort({ createdAt: -1 });
};

orderSchema.statics.findPending = function() {
  return this.find({ status: { $in: ['draft', 'confirmed', 'processing'] } });
};

orderSchema.statics.findDelivered = function() {
  return this.find({ status: 'delivered' });
};

const Order = mongoose.model('Order', orderSchema);
export default Order;
