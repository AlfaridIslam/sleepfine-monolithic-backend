import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../../config/index.js';

const driverSchema = new mongoose.Schema({
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
    enum: ['driver'],
    default: 'driver'
  },
  permissions: [{
    type: String,
    enum: [
      'view_assigned_deliveries',
      'update_delivery_status',
      'collect_payment',
      'update_payment_status',
      'view_gatepass',
      'update_gatepass_status',
      'view_delivery_route',
      'update_location',
      'view_customer_details',
      'contact_customer',
      'report_delivery_issues',
      'view_vehicle_details',
      'update_vehicle_status'
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
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'car', 'truck', 'van', 'other'],
      required: [true, 'Vehicle type is required']
    },
    number: {
      type: String,
      required: [true, 'Vehicle number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    model: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      min: [1990, 'Vehicle year must be 1990 or later'],
      max: [new Date().getFullYear() + 1, 'Vehicle year cannot be in the future']
    },
    color: {
      type: String,
      trim: true
    },
    capacity: {
      weight: {
        type: Number,
        min: [0, 'Weight capacity cannot be negative']
      },
      volume: {
        type: Number,
        min: [0, 'Volume capacity cannot be negative']
      }
    },
    insurance: {
      provider: {
        type: String,
        trim: true
      },
      policyNumber: {
        type: String,
        trim: true
      },
      expiryDate: {
        type: Date
      }
    },
    registration: {
      number: {
        type: String,
        trim: true
      },
      expiryDate: {
        type: Date
      }
    }
  },
  license: {
    number: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['two_wheeler', 'light_vehicle', 'heavy_vehicle', 'commercial'],
      required: [true, 'License type is required']
    },
    expiryDate: {
      type: Date,
      required: [true, 'License expiry date is required']
    },
    issuingAuthority: {
      type: String,
      trim: true
    }
  },
  workSchedule: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'on_demand'],
    default: 'full_time'
  },
  assignedZone: {
    type: String,
    trim: true
  },
  assignedWarehouse: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Emergency contact relationship is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required'],
      trim: true,
      match: [/^[0-9]{10,15}$/, 'Please enter a valid emergency contact phone number']
    }
  },
  currentStatus: {
    type: String,
    enum: ['available', 'on_delivery', 'break', 'offline', 'maintenance'],
    default: 'available'
  },
  currentLocation: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  performance: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Logistics',
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
driverSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

driverSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

driverSchema.virtual('isLicenseValid').get(function() {
  return this.license.expiryDate > new Date();
});

driverSchema.virtual('successRate').get(function() {
  if (this.performance.totalDeliveries === 0) return 0;
  return (this.performance.successfulDeliveries / this.performance.totalDeliveries) * 100;
});

driverSchema.virtual('isAvailable').get(function() {
  return this.currentStatus === 'available' && this.isActive && this.status === 'active';
});

// Indexes
driverSchema.index({ isActive: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ currentStatus: 1 });
driverSchema.index({ assignedZone: 1 });
driverSchema.index({ assignedWarehouse: 1 });
driverSchema.index({ manager: 1 });

// Pre-save middleware
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

driverSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.lastModifiedBy || null;
  }
  next();
});

// Instance methods
driverSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

driverSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= config.security.maxLoginAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + config.security.lockTime };
  }
  
  return this.updateOne(updates);
};

driverSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lockUntil: null }
  });
};

driverSchema.methods.updateLocation = function(latitude, longitude) {
  return this.updateOne({
    $set: {
      'currentLocation.latitude': latitude,
      'currentLocation.longitude': longitude,
      'currentLocation.lastUpdated': new Date()
    }
  });
};

driverSchema.methods.updatePerformance = function(isSuccessful, rating = null) {
  const updates = {
    $inc: {
      'performance.totalDeliveries': 1,
      'performance.successfulDeliveries': isSuccessful ? 1 : 0,
      'performance.failedDeliveries': isSuccessful ? 0 : 1
    }
  };

  if (rating !== null) {
    updates.$inc['performance.totalRatings'] = 1;
    const newTotal = this.performance.totalRatings + 1;
    const newAverage = ((this.performance.averageRating * this.performance.totalRatings) + rating) / newTotal;
    updates.$set = { 'performance.averageRating': newAverage };
  }

  return this.updateOne(updates);
};

// Static methods
driverSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

driverSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

driverSchema.statics.findByVehicleNumber = function(vehicleNumber) {
  return this.findOne({ 'vehicle.number': vehicleNumber.toUpperCase() });
};

driverSchema.statics.findByLicenseNumber = function(licenseNumber) {
  return this.findOne({ 'license.number': licenseNumber });
};

driverSchema.statics.findActive = function() {
  return this.find({ isActive: true, status: 'active' });
};

driverSchema.statics.findAvailable = function() {
  return this.find({ 
    isActive: true, 
    status: 'active', 
    currentStatus: 'available' 
  });
};

driverSchema.statics.findByZone = function(zone) {
  return this.find({ assignedZone: zone, isActive: true });
};

driverSchema.statics.findByWarehouse = function(warehouse) {
  return this.find({ assignedWarehouse: warehouse, isActive: true });
};

driverSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDrivers: { $sum: 1 },
        activeDrivers: {
          $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $eq: ['$status', 'active'] }] }, 1, 0] }
        },
        availableDrivers: {
          $sum: { $cond: [{ $and: [
            { $eq: ['$isActive', true] }, 
            { $eq: ['$status', 'active'] }, 
            { $eq: ['$currentStatus', 'available'] }
          ] }, 1, 0] }
        },
        onDeliveryDrivers: {
          $sum: { $cond: [{ $eq: ['$currentStatus', 'on_delivery'] }, 1, 0] }
        },
        totalDeliveries: { $sum: '$performance.totalDeliveries' },
        successfulDeliveries: { $sum: '$performance.successfulDeliveries' },
        averageRating: { $avg: '$performance.averageRating' }
      }
    }
  ]);
  
  return stats[0] || {
    totalDrivers: 0,
    activeDrivers: 0,
    availableDrivers: 0,
    onDeliveryDrivers: 0,
    totalDeliveries: 0,
    successfulDeliveries: 0,
    averageRating: 0
  };
};

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
