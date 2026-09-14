import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema({
  templateId: {
    type: String,
    required: [true, 'Template ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['order_created', 'order_updated', 'gatepass_created', 'gatepass_validated', 'payment_received', 'delivery_completed', 'manufacturing_started', 'manufacturing_completed', 'quality_check', 'system_alert', 'reminder', 'announcement'],
    required: [true, 'Template type is required']
  },
  category: {
    type: String,
    enum: ['order', 'gatepass', 'payment', 'delivery', 'manufacturing', 'quality', 'system', 'reminder'],
    required: [true, 'Template category is required']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  channels: [{
    type: String,
    enum: ['email', 'sms', 'whatsapp', 'push', 'in_app', 'webhook'],
    required: [true, 'At least one delivery channel is required']
  }],
  targetRoles: [{
    type: String,
    enum: ['admin', 'salesman', 'logistics', 'driver', 'accounts'],
    required: [true, 'At least one target role is required']
  }],
  templates: {
    title: {
      type: String,
      required: [true, 'Title template is required'],
      trim: true,
      maxlength: [200, 'Title template cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Message template is required'],
      trim: true,
      maxlength: [1000, 'Message template cannot exceed 1000 characters']
    },
    whatsappMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'WhatsApp message template cannot exceed 1000 characters']
    },
    emailSubject: {
      type: String,
      trim: true,
      maxlength: [200, 'Email subject cannot exceed 200 characters']
    },
    emailBody: {
      type: String,
      trim: true
    },
    smsMessage: {
      type: String,
      trim: true,
      maxlength: [160, 'SMS message cannot exceed 160 characters']
    }
  },
  variables: [{
    name: {
      type: String,
      required: [true, 'Variable name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean', 'object'],
      default: 'string'
    },
    description: {
      type: String,
      trim: true
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  }],
  whatsappConfig: {
    groupUrl: {
      type: String,
      default: 'https://chat.whatsapp.com/KGwplcCVgf9HbNboZ5L9iE',
      trim: true
    },
    isManual: {
      type: Boolean,
      default: true
    },
    instructions: {
      type: String,
      default: 'Please manually share this information in the WhatsApp group',
      trim: true
    },
    formatTemplate: {
      type: String,
      trim: true
    }
  },
  formatting: {
    useEmojis: {
      type: Boolean,
      default: true
    },
    useMarkdown: {
      type: Boolean,
      default: false
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY HH:mm',
      trim: true
    },
    currencyFormat: {
      type: String,
      default: '₹',
      trim: true
    }
  },
  conditions: [{
    field: {
      type: String,
      trim: true
    },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains'],
      default: 'equals'
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    },
    action: {
      type: String,
      enum: ['send', 'skip', 'modify'],
      default: 'send'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: [true, 'Creator is required']
  },
  createdByModel: {
    type: String,
    enum: ['Admin', 'System'],
    default: 'Admin'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'lastModifiedByModel',
    default: null
  },
  lastModifiedByModel: {
    type: String,
    enum: ['Admin', 'System'],
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
notificationTemplateSchema.virtual('isWhatsAppEnabled').get(function() {
  return this.channels.includes('whatsapp');
});

notificationTemplateSchema.virtual('hasVariables').get(function() {
  return this.variables && this.variables.length > 0;
});

notificationTemplateSchema.virtual('requiredVariables').get(function() {
  return this.variables.filter(variable => variable.required);
});

// Indexes
notificationTemplateSchema.index({ type: 1 });
notificationTemplateSchema.index({ category: 1 });
notificationTemplateSchema.index({ isActive: 1 });
notificationTemplateSchema.index({ targetRoles: 1 });
notificationTemplateSchema.index({ channels: 1 });
notificationTemplateSchema.index({ createdAt: -1 });

// Pre-save middleware
notificationTemplateSchema.pre('save', function(next) {
  // Auto-generate template ID if not provided
  if (!this.templateId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.templateId = `TPL${timestamp}${random}`;
  }
  
  // Auto-generate WhatsApp format template if not provided
  if (this.channels.includes('whatsapp') && !this.templates.whatsappMessage) {
    this.templates.whatsappMessage = this.templates.message;
  }
  
  next();
});

// Instance methods
notificationTemplateSchema.methods.renderTemplate = function(templateType, variables = {}) {
  let template = this.templates[templateType];
  if (!template) return null;

  // Replace variables in template
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    let value = variables[key];
    
    // Format based on variable type
    const variable = this.variables.find(v => v.name === key);
    if (variable && variable.type === 'date' && value) {
      value = new Date(value).toLocaleString('en-IN');
    } else if (variable && variable.type === 'number' && typeof value === 'number') {
      if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price')) {
        value = `${this.formatting.currencyFormat}${value.toLocaleString('en-IN')}`;
      } else {
        value = value.toLocaleString('en-IN');
      }
    }
    
    template = template.replace(regex, value !== undefined && value !== null ? value : '');
  });

  // Add emojis if enabled
  if (this.formatting.useEmojis && templateType === 'whatsappMessage') {
    template = this.addEmojis(template);
  }

  return template;
};

notificationTemplateSchema.methods.addEmojis = function(message) {
  const emojiMap = {
    'order_created': '🆕',
    'order_updated': '📋',
    'gatepass_created': '🎫',
    'gatepass_validated': '✅',
    'payment_received': '💰',
    'delivery_completed': '🚚',
    'manufacturing_started': '🏭',
    'manufacturing_completed': '✨',
    'quality_check': '🔍',
    'system_alert': '⚠️',
    'reminder': '⏰',
    'announcement': '📢'
  };

  const emoji = emojiMap[this.type] || '📌';
  return `${emoji} ${message}`;
};

notificationTemplateSchema.methods.validateVariables = function(variables = {}) {
  const errors = [];
  
  this.requiredVariables.forEach(variable => {
    if (!variables[variable.name]) {
      errors.push(`Required variable '${variable.name}' is missing`);
    }
  });

  return errors;
};

notificationTemplateSchema.methods.generateWhatsAppShareData = function(variables = {}) {
  const message = this.renderTemplate('whatsappMessage', variables);
  return {
    groupUrl: this.whatsappConfig.groupUrl,
    message: message,
    instructions: this.whatsappConfig.instructions,
    isManual: this.whatsappConfig.isManual,
    shareUrl: `${this.whatsappConfig.groupUrl}&text=${encodeURIComponent(message)}`
  };
};

// Static methods
notificationTemplateSchema.statics.findByType = function(type) {
  return this.findOne({ type, isActive: true });
};

notificationTemplateSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ createdAt: -1 });
};

notificationTemplateSchema.statics.findByRole = function(role) {
  return this.find({ targetRoles: role, isActive: true }).sort({ createdAt: -1 });
};

notificationTemplateSchema.statics.findByChannel = function(channel) {
  return this.find({ channels: channel, isActive: true }).sort({ createdAt: -1 });
};

notificationTemplateSchema.statics.getActiveTemplates = function() {
  return this.find({ isActive: true }).sort({ category: 1, type: 1 });
};

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export default NotificationTemplate;
