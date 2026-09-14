import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: [true, 'Log ID is required'],
    unique: true,
    trim: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters']
  },
  actionType: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'verify', 'send', 'receive'],
    required: [true, 'Action type is required']
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true,
    maxlength: [100, 'Resource cannot exceed 100 characters']
  },
  resourceId: {
    type: String,
    trim: true
  },
  service: {
    type: String,
    enum: ['admin', 'sales', 'accounts', 'logistics', 'notifications', 'system', 'monolithic'],
    required: [true, 'Service is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: [true, 'User ID is required']
  },
  userModel: {
    type: String,
    enum: ['Admin', 'Salesman', 'Accountant', 'Logistics', 'Driver'],
    required: [true, 'User model is required']
  },
  userDetails: {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      trim: true
    },
    employeeId: {
      type: String,
      trim: true
    }
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    fields: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  },
  metadata: {
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    sessionId: {
      type: String,
      trim: true
    },
    requestId: {
      type: String,
      trim: true
    },
    endpoint: {
      type: String,
      trim: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      trim: true
    },
    statusCode: {
      type: Number
    },
    responseTime: {
      type: Number
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['authentication', 'authorization', 'data_access', 'data_modification', 'system_change', 'security', 'compliance', 'error'],
    required: [true, 'Category is required']
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning', 'error'],
    default: 'success'
  },
  errorDetails: {
    message: String,
    code: String,
    stack: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isReviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Review notes cannot exceed 500 characters']
  },
  retentionDate: {
    type: Date,
    required: [true, 'Retention date is required']
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
auditLogSchema.virtual('isHighRisk').get(function() {
  return this.severity === 'high' || this.severity === 'critical';
});

auditLogSchema.virtual('isPendingReview').get(function() {
  return !this.isReviewed && (this.severity === 'high' || this.severity === 'critical');
});

auditLogSchema.virtual('isExpired').get(function() {
  return new Date() > this.retentionDate;
});

auditLogSchema.virtual('daysSinceAction').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

auditLogSchema.virtual('hasChanges').get(function() {
  return this.changes.before || this.changes.after || (this.changes.fields && this.changes.fields.length > 0);
});

// Indexes
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ service: 1 });
auditLogSchema.index({ actionType: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ resourceId: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ isReviewed: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ retentionDate: 1 });
auditLogSchema.index({ isArchived: 1 });

auditLogSchema.methods.calculateSeverity = function() {
  if (['delete', 'approve', 'reject'].includes(this.actionType) && 
      ['admin', 'system'].includes(this.service)) {
    return 'critical';
  }
  
  if (this.status === 'error' || 
      this.category === 'security' || 
      this.actionType === 'delete' ||
      (this.actionType === 'update' && this.resource.includes('user'))) {
    return 'high';
  }
  
  if (['login', 'logout'].includes(this.actionType) || 
      this.category === 'authentication') {
    return 'medium';
  }
  
  return 'low';
};

auditLogSchema.methods.markAsReviewed = function(reviewedBy, notes = '') {
  this.isReviewed = true;
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

auditLogSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Static methods
auditLogSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

auditLogSchema.statics.findByService = function(service) {
  return this.find({ service }).sort({ createdAt: -1 });
};

auditLogSchema.statics.findByAction = function(actionType) {
  return this.find({ actionType }).sort({ createdAt: -1 });
};

auditLogSchema.statics.findByResource = function(resource, resourceId = null) {
  const query = { resource };
  if (resourceId) query.resourceId = resourceId;
  return this.find(query).sort({ createdAt: -1 });
};

auditLogSchema.statics.findBySeverity = function(severity) {
  return this.find({ severity }).sort({ createdAt: -1 });
};

auditLogSchema.statics.findPendingReview = function() {
  return this.find({ 
    isReviewed: false, 
    severity: { $in: ['high', 'critical'] } 
  }).sort({ createdAt: -1 });
};

auditLogSchema.statics.getStats = async function(dateRange = {}) {
  const matchQuery = {};
  if (dateRange.startDate || dateRange.endDate) {
    matchQuery.createdAt = {};
    if (dateRange.startDate) matchQuery.createdAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) matchQuery.createdAt.$lte = new Date(dateRange.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
        },
        errorActions: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
        },
        highRiskActions: {
          $sum: { $cond: [{ $in: ['$severity', ['high', 'critical']] }, 1, 0] }
        },
        pendingReview: {
          $sum: { $cond: [{ $and: [{ $eq: ['$isReviewed', false] }, { $in: ['$severity', ['high', 'critical']] }] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalLogs: 0,
    successfulActions: 0,
    failedActions: 0,
    errorActions: 0,
    highRiskActions: 0,
    pendingReview: 0
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
