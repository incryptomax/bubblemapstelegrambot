const mongoose = require('mongoose');

/**
 * TokenRating model for storing user ratings (likes/dislikes) for tokens
 */
const tokenRatingSchema = new mongoose.Schema({
  // Token contract address
  contractAddress: {
    type: String,
    required: true
  },
  
  // Blockchain network
  chain: {
    type: String,
    required: true
  },
  
  // Token name (if available)
  name: {
    type: String,
    default: ''
  },
  
  // Token symbol (if available)
  symbol: {
    type: String,
    default: ''
  },
  
  // Number of likes
  likesCount: {
    type: Number,
    default: 0
  },
  
  // Number of dislikes
  dislikesCount: {
    type: Number,
    default: 0
  },
  
  // Array of user IDs who liked the token
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Array of user IDs who disliked the token
  dislikedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Last updated timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Define combined index for contract and chain as they form a unique key
tokenRatingSchema.index({ contractAddress: 1, chain: 1 }, { unique: true });

// Static method to get or create token rating
tokenRatingSchema.statics.findOrCreate = async function(contractAddress, chain, name = '', symbol = '') {
  let tokenRating = await this.findOne({ contractAddress, chain });
  
  if (!tokenRating) {
    tokenRating = new this({
      contractAddress,
      chain,
      name,
      symbol,
      likesCount: 0,
      dislikesCount: 0,
      likedBy: [],
      dislikedBy: []
    });
    await tokenRating.save();
  } else if ((name && tokenRating.name !== name) || (symbol && tokenRating.symbol !== symbol)) {
    // Update name/symbol if provided and different
    tokenRating.name = name || tokenRating.name;
    tokenRating.symbol = symbol || tokenRating.symbol;
    tokenRating.lastUpdated = Date.now();
    await tokenRating.save();
  }
  
  return tokenRating;
};

// Static method to get top rated tokens
tokenRatingSchema.statics.getTopRatedTokens = async function(limit = 10) {
  return this.aggregate([
    {
      $addFields: {
        popularityScore: { $subtract: ['$likesCount', '$dislikesCount'] },
        totalVotes: { $add: ['$likesCount', '$dislikesCount'] }
      }
    },
    {
      $match: {
        totalVotes: { $gt: 0 } // Only include tokens with at least one vote
      }
    },
    {
      $sort: { popularityScore: -1, totalVotes: -1, lastUpdated: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        contractAddress: 1,
        chain: 1,
        name: 1,
        symbol: 1,
        likesCount: 1,
        dislikesCount: 1,
        popularityScore: 1,
        totalVotes: 1
      }
    }
  ]);
};

const TokenRating = mongoose.model('TokenRating', tokenRatingSchema);

module.exports = TokenRating; 