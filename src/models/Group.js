const mongoose = require('mongoose');

/**
 * Group model for storing Telegram group information
 */
const groupSchema = new mongoose.Schema({
  // Telegram chat ID
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Group name
  name: {
    type: String,
    required: true
  },
  
  // Group username (optional)
  username: {
    type: String
  },
  
  // Number of members (if available)
  memberCount: {
    type: Number,
    default: 0
  },
  
  // Total tokens checked in this group
  tokensChecked: {
    type: Number,
    default: 0
  },
  
  // First activity timestamp
  firstSeen: {
    type: Date,
    default: Date.now
  },
  
  // Most recent activity timestamp
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Whether the group is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Bot status in group
  botStatus: {
    type: String,
    enum: ['member', 'admin', 'unknown'],
    default: 'unknown'
  },
  
  // Token checks counter per day
  dailyChecks: [{
    date: { type: Date, required: true },
    count: { type: Number, default: 0 }
  }]
}, { 
  timestamps: true 
});

// Define indexes
groupSchema.index({ chatId: 1 });
groupSchema.index({ lastActivity: -1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ tokensChecked: -1 });

// Define static methods
groupSchema.statics.findOrCreate = async function(groupData) {
  const { chatId } = groupData;
  
  let group = await this.findOne({ chatId });
  
  if (!group) {
    group = new this(groupData);
    await group.save();
  } else {
    // Update group data if it exists
    group.name = groupData.name || group.name;
    group.username = groupData.username;
    group.lastActivity = Date.now();
    if (groupData.memberCount) {
      group.memberCount = groupData.memberCount;
    }
    if (groupData.botStatus) {
      group.botStatus = groupData.botStatus;
    }
    await group.save();
  }
  
  return group;
};

// Define instance methods
groupSchema.methods.incrementTokenChecks = async function() {
  this.tokensChecked += 1;
  this.lastActivity = Date.now();
  
  // Update daily checks counter
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dailyRecord = this.dailyChecks.find(record => {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });
  
  if (dailyRecord) {
    dailyRecord.count += 1;
  } else {
    this.dailyChecks.push({
      date: today,
      count: 1
    });
  }
  
  // Keep only last 30 days of data
  if (this.dailyChecks.length > 30) {
    this.dailyChecks.sort((a, b) => b.date - a.date);
    this.dailyChecks = this.dailyChecks.slice(0, 30);
  }
  
  return this.save();
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group; 