const mongoose = require('mongoose');
const constants = require('../../config/constants');

/**
 * Interaction model for tracking user interactions with the bot
 */
const interactionSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Telegram user ID (for quick lookup)
  telegramId: {
    type: String,
    required: true
  },
  
  // Type of interaction
  type: {
    type: String,
    enum: Object.values(constants.interactionTypes),
    required: true
  },
  
  // Additional data specific to the interaction
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Define indexes
interactionSchema.index({ telegramId: 1 });
interactionSchema.index({ type: 1 });
interactionSchema.index({ timestamp: -1 });
interactionSchema.index({ user: 1, type: 1 });

// Define static method to log interactions
interactionSchema.statics.log = async function(user, type, data = {}) {
  const interaction = new this({
    user: user._id,
    telegramId: user.telegramId,
    type,
    data
  });
  
  return interaction.save();
};

// Static method to get statistics
interactionSchema.statics.getStats = async function(startDate = null, endDate = null) {
  const query = {};
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  // Get total interactions
  const totalInteractions = await this.countDocuments(query);
  
  // Get interactions by type
  const interactionsByType = await this.aggregate([
    { $match: query },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  // Get top tokens checked
  const tokensChecked = await this.aggregate([
    { $match: { type: constants.interactionTypes.CHECK_TOKEN } },
    { $group: { _id: '$data.token', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  // Get popular chains
  const popularChains = await this.aggregate([
    { $match: { type: constants.interactionTypes.CHECK_TOKEN } },
    { $group: { _id: '$data.chain', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  return {
    totalInteractions,
    interactionsByType: interactionsByType.map(item => ({ type: item._id, count: item.count })),
    tokensChecked: tokensChecked.map(item => ({ token: item._id, count: item.count })),
    popularChains: popularChains.map(item => ({ id: item._id, count: item.count }))
  };
};

const Interaction = mongoose.model('Interaction', interactionSchema);

module.exports = Interaction; 