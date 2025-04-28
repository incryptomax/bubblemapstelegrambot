const mongoose = require('mongoose');

/**
 * User model for storing user information and preferences
 */
const userSchema = new mongoose.Schema({
  // Telegram user ID
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  
  // User's username (optional)
  username: {
    type: String
  },
  
  // User's first name
  firstName: {
    type: String
  },
  
  // User's last name (optional)
  lastName: {
    type: String
  },
  
  // Whether the user is admin
  isAdmin: {
    type: Boolean,
    default: false
  },
  
  // User's preferred chain
  preferredChain: {
    type: String,
    default: 'eth'
  },
  
  // User's current state/context
  state: {
    type: String,
    enum: ['idle', 'awaiting_contract', 'awaiting_chain', 'awaiting_broadcast_message'],
    default: 'idle'
  },
  
  // User's most recent activity timestamp
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // First interaction timestamp
  firstSeen: {
    type: Date,
    default: Date.now
  },
  
  // Whether the user is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // User's favorite tokens
  favorites: [{
    contractAddress: { type: String, required: true },
    chain: { type: String, required: true },
    name: { type: String },
    symbol: { type: String },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // User's recently checked tokens
  recentlyChecked: [{
    contractAddress: { type: String, required: true },
    chain: { type: String, required: true },
    name: { type: String },
    symbol: { type: String },
    lastCheckedAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

// Define indexes
userSchema.index({ telegramId: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ isActive: 1 });

// Define static methods
userSchema.statics.findOrCreate = async function(userData) {
  const { telegramId } = userData;
  
  let user = await this.findOne({ telegramId });
  
  if (!user) {
    user = new this(userData);
    await user.save();
  } else {
    // Update user data if it exists
    user.username = userData.username;
    user.firstName = userData.firstName;
    user.lastName = userData.lastName;
    user.lastActivity = Date.now();
    await user.save();
  }
  
  return user;
};

// Define instance methods
userSchema.methods.updateActivity = async function() {
  this.lastActivity = Date.now();
  return this.save();
};

userSchema.methods.setPreferredChain = async function(chain) {
  this.preferredChain = chain;
  return this.save();
};

userSchema.methods.setState = async function(state) {
  this.state = state;
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 