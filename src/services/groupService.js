const Group = require('../models/Group');
const logger = require('../utils/logger');

/**
 * Service for group management and statistics
 */
class GroupService {
  /**
   * Register a group and update its information
   * @param {Object} groupData - Group information
   * @returns {Promise<Object>} - Created or updated group
   */
  async registerGroup(groupData) {
    try {
      if (!groupData || !groupData.chatId) {
        logger.error('Invalid group data provided');
        return null;
      }

      return await Group.findOrCreate(groupData);
    } catch (error) {
      logger.error(`Error registering group: ${error.message}`);
      return null;
    }
  }

  /**
   * Track token check in a group
   * @param {string} chatId - Group chat ID
   * @returns {Promise<boolean>} - Success status
   */
  async trackTokenCheck(chatId) {
    try {
      const group = await Group.findOne({ chatId });
      if (!group) {
        logger.error(`Group not found: ${chatId}`);
        return false;
      }

      await group.incrementTokenChecks();
      return true;
    } catch (error) {
      logger.error(`Error tracking token check for group ${chatId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get group statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Group statistics
   */
  async getGroupStats(options = {}) {
    try {
      const { limit = 10, activeOnly = true } = options;

      // Build query
      const query = {};
      if (activeOnly) {
        query.isActive = true;
      }

      // Get total count of groups
      const totalGroups = await Group.countDocuments(query);
      
      // Get active groups (active in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const activeGroups = await Group.countDocuments({
        ...query,
        lastActivity: { $gte: sevenDaysAgo }
      });

      // Get total tokens checked across all groups
      const totalChecksResult = await Group.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$tokensChecked' } } }
      ]);
      
      const totalChecks = totalChecksResult.length > 0 ? totalChecksResult[0].total : 0;

      // Get top active groups by token checks
      const topGroups = await Group.find(query)
        .sort({ tokensChecked: -1 })
        .limit(limit)
        .lean();

      // Get checks in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const checkedToday = await Group.aggregate([
        { $match: { ...query, lastActivity: { $gte: oneDayAgo } } },
        { $unwind: '$dailyChecks' },
        { $match: { 'dailyChecks.date': { $gte: oneDayAgo } } },
        { $group: { _id: null, total: { $sum: '$dailyChecks.count' } } }
      ]);
      
      const todayChecks = checkedToday.length > 0 ? checkedToday[0].total : 0;

      // Get daily activity for the last 7 days
      const dailyActivity = await this.getDailyActivity(7);

      return {
        totalGroups,
        activeGroups,
        totalChecks,
        todayChecks,
        topGroups: topGroups.map(group => ({
          chatId: group.chatId,
          name: group.name,
          username: group.username,
          memberCount: group.memberCount,
          tokensChecked: group.tokensChecked,
          lastActivity: group.lastActivity
        })),
        dailyActivity
      };
    } catch (error) {
      logger.error(`Error getting group stats: ${error.message}`);
      return {
        totalGroups: 0,
        activeGroups: 0,
        totalChecks: 0,
        todayChecks: 0,
        topGroups: [],
        dailyActivity: []
      };
    }
  }

  /**
   * Get daily activity for all groups
   * @param {number} days - Number of days to return
   * @returns {Promise<Array>} - Daily activity data
   */
  async getDailyActivity(days = 7) {
    try {
      const result = [];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      
      // Generate all dates in range
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);
        
        const dayData = {
          date: date,
          count: 0
        };
        
        result.push(dayData);
      }
      
      // Query daily checks data
      const dailyData = await Group.aggregate([
        { 
          $match: { 
            isActive: true
          } 
        },
        { 
          $unwind: '$dailyChecks' 
        },
        { 
          $match: { 
            'dailyChecks.date': { $gte: startDate, $lte: endDate } 
          } 
        },
        { 
          $group: { 
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$dailyChecks.date' } 
            }, 
            count: { $sum: '$dailyChecks.count' } 
          } 
        },
        { 
          $sort: { _id: 1 } 
        }
      ]);
      
      // Update counts in result array
      dailyData.forEach(day => {
        const dayDate = new Date(day._id);
        const resultIndex = result.findIndex(r => {
          const rDate = new Date(r.date);
          rDate.setHours(0, 0, 0, 0);
          return rDate.getTime() === dayDate.getTime();
        });
        
        if (resultIndex !== -1) {
          result[resultIndex].count = day.count;
        }
      });
      
      return result;
    } catch (error) {
      logger.error(`Error getting daily activity: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a list of groups
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Groups list with pagination info
   */
  async getGroupsList(options = {}) {
    try {
      const {
        limit = 20,
        skip = 0,
        sortBy = 'lastActivity',
        sortOrder = 'desc',
        activeOnly = true
      } = options;
      
      // Sanitize options
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
      const sanitizedSkip = Math.max(parseInt(skip) || 0, 0);
      
      const validSortFields = ['lastActivity', 'createdAt', 'name', 'tokensChecked', 'memberCount'];
      const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : 'lastActivity';
      const sanitizedSortOrder = sortOrder === 'asc' ? 1 : -1;
      
      // Build query
      const query = {};
      if (activeOnly) {
        query.isActive = true;
      }
      
      // Build sort
      const sort = { [sanitizedSortBy]: sanitizedSortOrder };
      
      const [groups, totalGroups] = await Promise.all([
        Group.find(query)
          .sort(sort)
          .skip(sanitizedSkip)
          .limit(sanitizedLimit)
          .lean(),
        Group.countDocuments(query)
      ]);
      
      return {
        groups,
        totalGroups,
        hasMore: totalGroups > sanitizedSkip + sanitizedLimit
      };
    } catch (error) {
      logger.error(`Error getting groups list: ${error.message}`);
      return {
        groups: [],
        totalGroups: 0,
        hasMore: false
      };
    }
  }
}

module.exports = new GroupService(); 