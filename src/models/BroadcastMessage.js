const mongoose = require('mongoose');

/**
 * BroadcastMessage model for storing admin broadcast messages
 */
const broadcastMessageSchema = new mongoose.Schema({
  // Admin who initiated the broadcast
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Telegram admin ID (for quick lookup)
  adminTelegramId: {
    type: String,
    required: true
  },
  
  // Message content
  message: {
    type: String,
    required: true
  },
  
  // Delivery status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Recipients count
  targetCount: {
    type: Number,
    default: 0
  },
  
  // Successfully delivered count
  deliveredCount: {
    type: Number,
    default: 0
  },
  
  // Failed delivery count
  failedCount: {
    type: Number,
    default: 0
  },
  
  // Detailed delivery info (optional)
  deliveryDetails: [{
    userId: String,
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed']
    },
    error: String,
    timestamp: Date
  }],
  
  // Completed timestamp
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Define indexes
broadcastMessageSchema.index({ adminTelegramId: 1 });
broadcastMessageSchema.index({ status: 1 });
broadcastMessageSchema.index({ createdAt: -1 });

// Define static method to create new broadcast
broadcastMessageSchema.statics.createBroadcast = async function(admin, message, targetUsers = []) {
  const broadcast = new this({
    admin: admin._id,
    adminTelegramId: admin.telegramId,
    message,
    targetCount: targetUsers.length,
    status: 'pending',
    deliveryDetails: targetUsers.map(user => ({
      userId: user.telegramId,
      status: 'pending'
    }))
  });
  
  return broadcast.save();
};

// Define method to update delivery status
broadcastMessageSchema.methods.updateDeliveryStatus = async function(userId, success, error = null) {
  // Find the user in delivery details
  const userDetail = this.deliveryDetails.find(detail => detail.userId === userId);
  
  if (userDetail) {
    userDetail.status = success ? 'delivered' : 'failed';
    userDetail.timestamp = new Date();
    if (error) userDetail.error = error;
    
    // Update counts
    if (success) {
      this.deliveredCount += 1;
    } else {
      this.failedCount += 1;
    }
    
    // Check if broadcast is complete
    if (this.deliveredCount + this.failedCount >= this.targetCount) {
      this.status = 'completed';
      this.completedAt = new Date();
    } else {
      this.status = 'in_progress';
    }
    
    return this.save();
  }
  
  return this;
};

const BroadcastMessage = mongoose.model('BroadcastMessage', broadcastMessageSchema);

module.exports = BroadcastMessage; 