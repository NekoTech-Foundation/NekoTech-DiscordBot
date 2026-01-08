const SQLiteModel = require('../utils/sqliteModel');
const crypto = require('../utils/sepayCrypto');

const defaultData = (query) => ({
    guildId: query.guildId,
    encryptedApiKey: null,
    accountNumber: null,
    bankCode: null,
    channelId: null,
    merchantInfo: {} // Store generic merchant info if needed
});

class SePayConfigModel extends SQLiteModel {
    constructor() {
        super('sepay_configs', 'guildId', defaultData);
    }

    async setApiKey(guildId, apiKey) {
        const config = await this.findOne({ guildId });
        if (config) {
            config.encryptedApiKey = crypto.encrypt(apiKey);
            return await config.save();
        }
        return await this.create({ guildId, encryptedApiKey: crypto.encrypt(apiKey) });
    }

    async getApiKey(guildId) {
        const config = await this.findOne({ guildId });
        if (config && config.encryptedApiKey) {
            return crypto.decrypt(config.encryptedApiKey);
        }
        return null;
    }
}

module.exports = new SePayConfigModel();
