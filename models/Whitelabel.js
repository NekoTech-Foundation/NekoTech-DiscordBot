const SQLiteModel = require('../utils/sqliteModel');

// Default data structure for a new whitelabel instance
const defaultData = (query) => ({
    userId: query.userId,
    botToken: null,
    clientId: null,
    serverToken: null, // Optional: if we need to authenticate specific requests
    status: 'STOPPED', // ACTIVE, STOPPED, EXPIRED
    planType: '1m', // 1m, 3m, 6m, 1y
    startDate: new Date().toISOString(),
    expiryDate: null,
    port: 0, // Assigned port if needed for internal webhooks
    instancePath: null
});

class WhitelabelModel extends SQLiteModel {
    constructor() {
        // Table name: 'whitelabel_instances'
        // Primary Key: 'userId'
        super('whitelabel_instances', 'userId', defaultData);
    }

    /**
     * Create or update a subscription
     * @param {string} userId 
     * @param {object} data 
     */
    async setSubscription(userId, data) {
        const current = await this.findOne({ userId });
        if (current) {
            Object.assign(current, data);
            return await current.save();
        }
        return await this.create({ userId, ...data });
    }

    /**
     * Get all active instances that might need checking
     */
    async getAllInstances() {
        return await this.find({});
    }
}

module.exports = new WhitelabelModel();
