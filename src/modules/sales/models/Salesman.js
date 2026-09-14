import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../../config/index.js';

const salesmanSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^[0-9+\s-]{7,15}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['salesman'],
    default: 'salesman'
  },
  permissions: [{
    type: String,
    enum: [
      'create_order',
      'view_order',
      'update_order',
      'delete_order',
      'view_own_orders',
      'view_sales_reports',
      'view_own_performance',
      'create_customer',
      'view_customer',
      'update_customer',
      'view_products',
      'view_pricing',
      'send_notifications'
    ]
  }],
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastLoginIp: {
    type: String,
    default: null
  },
  salesTarget: {
    monthly: {
      type: Number,
      default: 0
    },
    yearly: {
      type: Number,
      default: 0
    }
  },
  commission: {
    percentage: {
      type: Number,
      default: 0,
      min: [0, 'Commission percentage cannot be negative'],
      max: [100, 'Commission percentage cannot exceed 100']
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
  },
  assignedTerritory: {
    type: String,
    trim: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  terminationDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
salesmanSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

salesmanSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
salesmanSchema.index({ isActive: 1 });
salesmanSchema.index({ status: 1 });

// Pre-save middleware to hash password
salesmanSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

salesmanSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

salesmanSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

salesmanSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lockUntil: null }
  });
};

salesmanSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

salesmanSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

salesmanSchema.statics.findActive = function() {
  return this.find({ isActive: true, status: 'active' });
};

const Salesman = mongoose.model('Salesman', salesmanSchema);
export default Salesman;
