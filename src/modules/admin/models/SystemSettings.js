import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Setting key cannot exceed 100 characters']
  },
  settingName: {
    type: String,
    required: [true, 'Setting name is required'],
    trim: true,
    maxlength: [200, 'Setting name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['general', 'security', 'notifications', 'payments', 'inventory', 'reporting', 'integrations', 'ui', 'performance'],
    required: [true, 'Setting category is required']
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object', 'date'],
    required: [true, 'Data type is required']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required']
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Default value is required']
  },
  validation: {
    required: {
      type: Boolean,
      default: false
    },
    min: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    max: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    allowedValues: [{
      type: mongoose.Schema.Types.Mixed
    }],
    pattern: {
      type: String,
      default: null
    }
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  requiresRestart: {
    type: Boolean,
    default: false
  },
  isSystemCritical: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['super_admin', 'admin', 'user'],
    default: 'admin'
  },
  environment: [{
    type: String,
    enum: ['development', 'staging', 'production', 'all'],
    default: 'all'
  }],
  metadata: {
    version: {
      type: String,
      default: '1.0.0'
    },
    tags: [String],
    relatedSettings: [String],
    documentationUrl: String,
    changeLog: [{
      version: String,
      changes: String,
      date: {
        type: Date,
        default: Date.now
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
      }
    }]
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
systemSettingsSchema.virtual('isDefault').get(function() {
  return JSON.stringify(this.value) === JSON.stringify(this.defaultValue);
});

systemSettingsSchema.virtual('hasValidation').get(function() {
  return this.validation.required || 
         this.validation.min !== null || 
         this.validation.max !== null || 
         (this.validation.allowedValues && this.validation.allowedValues.length > 0) || 
         this.validation.pattern !== null;
});

systemSettingsSchema.virtual('canEdit').get(function() {
  return this.isEditable && !this.isSystemCritical;
});

// Indexes
systemSettingsSchema.index({ category: 1 });
systemSettingsSchema.index({ accessLevel: 1 });
systemSettingsSchema.index({ isVisible: 1 });
systemSettingsSchema.index({ environment: 1 });
systemSettingsSchema.index({ lastModifiedAt: -1 });

// Pre-save middleware
systemSettingsSchema.pre('save', function(next) {
  if (this.isModified('value')) {
    const validationError = this.validateValue(this.value);
    if (validationError) {
      return next(new Error(`Validation failed: ${validationError}`));
    }
    this.lastModifiedAt = new Date();
  }
  next();
});

// Instance methods
systemSettingsSchema.methods.validateValue = function(value) {
  const validation = this.validation;
  
  if (validation.required && (value === null || value === undefined || value === '')) {
    return 'Value is required';
  }
  
  if (this.dataType === 'number' && typeof value !== 'number') {
    return 'Value must be a number';
  }
  
  if (this.dataType === 'boolean' && typeof value !== 'boolean') {
    return 'Value must be a boolean';
  }
  
  if (this.dataType === 'array' && !Array.isArray(value)) {
    return 'Value must be an array';
  }
  
  if (this.dataType === 'number') {
    if (validation.min !== null && value < validation.min) {
      return `Value must be at least ${validation.min}`;
    }
    if (validation.max !== null && value > validation.max) {
      return `Value must be at most ${validation.max}`;
    }
  }
  
  if (validation.allowedValues && validation.allowedValues.length > 0 && !validation.allowedValues.includes(value)) {
    return `Value must be one of: ${validation.allowedValues.join(', ')}`;
  }
  
  if (this.dataType === 'string' && validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return 'Value does not match required pattern';
    }
  }
  
  return null;
};

systemSettingsSchema.methods.resetToDefault = function() {
  this.value = this.defaultValue;
  return this.save();
};

systemSettingsSchema.methods.addToChangeLog = function(changes, changedBy) {
  if (!this.metadata) this.metadata = {};
  if (!this.metadata.changeLog) this.metadata.changeLog = [];
  this.metadata.changeLog.push({
    version: this.metadata.version || '1.0.0',
    changes,
    date: new Date(),
    changedBy
  });
  return this.save();
};

// Static methods
systemSettingsSchema.statics.findByCategory = function(category) {
  return this.find({ category, isVisible: true }).sort({ settingName: 1 });
};

systemSettingsSchema.statics.findByAccessLevel = function(accessLevel) {
  const allowedLevels = accessLevel === 'super_admin' 
    ? ['super_admin', 'admin', 'user']
    : accessLevel === 'admin' 
      ? ['admin', 'user'] 
      : ['user'];
      
  return this.find({ 
    accessLevel: { $in: allowedLevels }, 
    isVisible: true 
  }).sort({ category: 1, settingName: 1 });
};

systemSettingsSchema.statics.findByEnvironment = function(environment) {
  return this.find({ 
    $or: [
      { environment: environment },
      { environment: 'all' }
    ],
    isVisible: true 
  }).sort({ category: 1, settingName: 1 });
};

systemSettingsSchema.statics.getSetting = function(settingKey) {
  return this.findOne({ settingKey });
};

systemSettingsSchema.statics.getSettingValue = async function(settingKey) {
  const setting = await this.findOne({ settingKey });
  return setting ? setting.value : null;
};

systemSettingsSchema.statics.updateSetting = async function(settingKey, value, updatedBy) {
  const setting = await this.findOne({ settingKey });
  if (!setting) {
    throw new Error(`Setting '${settingKey}' not found`);
  }
  
  if (!setting.isEditable) {
    throw new Error(`Setting '${settingKey}' is not editable`);
  }
  
  const oldValue = setting.value;
  setting.value = value;
  setting.lastModifiedBy = updatedBy;
  setting.lastModifiedAt = new Date();
  
  await setting.save();
  await setting.addToChangeLog(`Changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)}`, updatedBy);
  
  return setting;
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
export default SystemSettings;
