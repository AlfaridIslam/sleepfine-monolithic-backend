import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: [true, 'Notification ID is required'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['order_update', 'payment_update', 'delivery_update', 'manufacturing_update', 'system_alert', 'reminder', 'announcement'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipients.userModel',
      default: null
    },
    userModel: {
      type: String,
      enum: ['Admin', 'Salesman', 'Logistics', 'Driver', 'Accountant'],
      default: null
    },
    role: {
      type: String,
      enum: ['admin', 'salesman', 'logistics', 'driver', 'accounts'],
      required: [true, 'Recipient role is required']
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    deliveryAttempts: {
      type: Number,
      default: 0
    },
    lastDeliveryAttempt: {
      type: Date,
      default: null
    }
  }],
  channels: [{
    type: String,
    enum: ['email', 'sms', 'whatsapp', 'push', 'in_app', 'webhook'],
    required: [true, 'At least one delivery channel is required']
  }],
  deliveryDetails: {
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      emailId: {
        type: String,
        trim: true
      },
      error: {
        type: String,
        trim: true
      }
    },
    sms: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      messageId: {
        type: String,
        trim: true
      },
      error: {
        type: String,
        trim: true
      }
    },
    whatsapp: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      messageId: {
        type: String,
        trim: true
      },
      error: {
        type: String,
        trim: true
      }
    },
    push: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      deviceTokens: [{
        type: String,
        trim: true
      }],
      error: {
        type: String,
        trim: true
      }
    }
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['order', 'payment', 'gatepass', 'user', 'system'],
      default: 'system'
    },
    entityId: {
      type: String,
      trim: true
    },
    orderId: {
      type: String,
      trim: true
    }
  },
  metadata: {
    actionUrl: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true
    }],
    customData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  scheduling: {
    scheduledFor: {
      type: Date,
      default: null
    },
    isScheduled: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    repeat: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none'
    },
    repeatUntil: {
      type: Date,
      default: null
    }
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    default: null,
    required: [
      function() {
        return !this.isSystemGenerated;
      },
      'Created by is required for user-generated notifications'
    ]
  },
  createdByModel: {
    type: String,
    enum: ['Admin', 'Salesman', 'Logistics', 'Driver', 'Accountant'],
    default: null
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'lastModifiedByModel',
    default: null
  },
  lastModifiedByModel: {
    type: String,
    enum: ['Admin', 'Salesman', 'Logistics', 'Driver', 'Accountant'],
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
notificationSchema.virtual('isRead').get(function() {
  return this.recipients.every(recipient => recipient.isRead);
});

notificationSchema.virtual('isDelivered').get(function() {
  return this.recipients.every(recipient => recipient.deliveryStatus === 'delivered');
});

notificationSchema.virtual('isScheduled').get(function() {
  return this.scheduling.isScheduled && this.scheduling.scheduledFor > new Date();
});

notificationSchema.virtual('isExpired').get(function() {
  return this.scheduling.scheduledFor && this.scheduling.scheduledFor < new Date();
});

// Indexes
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'recipients.userId': 1 });
notificationSchema.index({ 'recipients.role': 1 });
notificationSchema.index({ 'relatedEntity.entityType': 1 });
notificationSchema.index({ 'relatedEntity.entityId': 1 });
notificationSchema.index({ 'relatedEntity.orderId': 1 });
notificationSchema.index({ 'scheduling.scheduledFor': 1 });
notificationSchema.index({ 'scheduling.isScheduled': 1 });
notificationSchema.index({ isSystemGenerated: 1 });

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Auto-generate notification ID if not provided
  if (!this.notificationId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.notificationId = `NOTIF${timestamp}${random}`;
  }
  
  // Auto-set scheduled status
  if (this.scheduling.scheduledFor && this.scheduling.scheduledFor > new Date()) {
    this.scheduling.isScheduled = true;
  }
  
  next();
});

// Static methods
notificationSchema.statics.findByNotificationId = function(notificationId) {
  return this.findOne({ notificationId });
};

notificationSchema.statics.findByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByRecipient = function(userId) {
  return this.find({ 'recipients.userId': userId }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByRole = function(role) {
  return this.find({ 'recipients.role': role }).sort({ createdAt: -1 });
};

notificationSchema.statics.findScheduled = function() {
  return this.find({
    'scheduling.isScheduled': true,
    'scheduling.scheduledFor': { $lte: new Date() }
  });
};

notificationSchema.statics.findByOrderId = function(orderId) {
  return this.find({ 'relatedEntity.orderId': orderId }).sort({ createdAt: -1 });
};

notificationSchema.statics.findUnread = function(userId) {
  return this.find({
    'recipients.userId': userId,
    'recipients.isRead': false
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        pendingNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        sentNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        deliveredNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        failedNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        scheduledNotifications: {
          $sum: { $cond: [{ $eq: ['$scheduling.isScheduled', true] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalNotifications: 0,
    pendingNotifications: 0,
    sentNotifications: 0,
    deliveredNotifications: 0,
    failedNotifications: 0,
    scheduledNotifications: 0
  };
};

notificationSchema.statics.getTypeStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        deliveredCount: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  return stats;
};

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
