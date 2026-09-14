import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../../config/index.js';

const logisticsSchema = new mongoose.Schema({
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
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
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
    enum: ['logistics'],
    default: 'logistics'
  },
  permissions: [{
    type: String,
    enum: [
      'view_orders',
      'update_orders',
      'manage_manufacturing',
      'create_gatepass',
      'update_gatepass',
      'view_gatepass',
      'manage_inventory',
      'update_inventory',
      'view_inventory',
      'manage_delivery',
      'update_delivery_status',
      'view_delivery_reports',
      'manage_quality_check',
      'view_quality_reports',
      'manage_packaging',
      'view_packaging_reports',
      'assign_drivers',
      'view_driver_reports',
      'manage_warehouse',
      'view_warehouse_reports'
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
  specialization: {
    type: String,
    enum: ['manufacturing', 'packaging', 'quality_control', 'warehouse', 'delivery', 'general'],
    default: 'general'
  },
  assignedWarehouse: {
    type: String,
    trim: true
  },
  assignedZone: {
    type: String,
    trim: true
  },
  workShift: {
    type: String,
    enum: ['morning', 'afternoon', 'night', 'flexible'],
    default: 'morning'
  },
  certifications: [{
    name: {
      type: String,
      trim: true
    },
    issuingBody: {
      type: String,
      trim: true
    },
    issueDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    certificateNumber: {
      type: String,
      trim: true
    }
  }],
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
logisticsSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

logisticsSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

logisticsSchema.virtual('isCertified').get(function() {
  return this.certifications && this.certifications.length > 0;
});

// Indexes
logisticsSchema.index({ isActive: 1 });
logisticsSchema.index({ status: 1 });
logisticsSchema.index({ manager: 1 });
logisticsSchema.index({ specialization: 1 });
logisticsSchema.index({ assignedWarehouse: 1 });
logisticsSchema.index({ assignedZone: 1 });

// Pre-save middleware
logisticsSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

logisticsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.lastModifiedBy || null;
  }
  next();
});

// Instance methods
logisticsSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

logisticsSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= config.security.maxLoginAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + config.security.lockTime };
  }
  
  return this.updateOne(updates);
};

logisticsSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lockUntil: null }
  });
};

// Static methods
logisticsSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

logisticsSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

logisticsSchema.statics.findActive = function() {
  return this.find({ isActive: true, status: 'active' });
};

logisticsSchema.statics.findBySpecialization = function(specialization) {
  return this.find({ specialization, isActive: true });
};

logisticsSchema.statics.findByWarehouse = function(warehouse) {
  return this.find({ assignedWarehouse: warehouse, isActive: true });
};

logisticsSchema.statics.findByZone = function(zone) {
  return this.find({ assignedZone: zone, isActive: true });
};

logisticsSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalLogistics: { $sum: 1 },
        activeLogistics: {
          $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $eq: ['$status', 'active'] }] }, 1, 0] }
        },
        inactiveLogistics: {
          $sum: { $cond: [{ $or: [{ $eq: ['$isActive', false] }, { $ne: ['$status', 'active'] }] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || { totalLogistics: 0, activeLogistics: 0, inactiveLogistics: 0 };
};

const Logistics = mongoose.model('Logistics', logisticsSchema);
export default Logistics;
