const cron = require('node-cron');
const WhitelabelModel = require('../models/Whitelabel');
const WhitelabelManager = require('../utils/whitelabelManager');
const moment = require('moment');

module.exports = (client) => {
    // Run every minute (For testing)
    cron.schedule('* * * * *', async () => {
        // console.log('[Whitelabel Cron] Checking expired instances...');
        const instances = await WhitelabelModel.getAllInstances();

        for (const data of instances) {
            // const data = JSON.parse(row.data); // No longer needed
            if (data.status === 'ACTIVE' && moment().isAfter(moment(data.expiryDate))) {
                console.log(`[Whitelabel Cron] Instance ${data.userId} expired. Stopping...`);

                await WhitelabelManager.stopInstance(data.userId);

                // Update DB status
                data.status = 'EXPIRED';
                // We need to fetch the document object to call save(), or use setSubscription
                await WhitelabelModel.setSubscription(data.userId, { status: 'EXPIRED' });

                // Notify User if possible
                try {
                    const user = await client.users.fetch(data.userId);
                    if (user) {
                        user.send('⚠️ **Thông báo:** Gói Whitelabel Bot của bạn đã hết hạn. Bot đã tạm dừng hoạt động. Vui lòng liên hệ Admin để gia hạn.').catch(() => { });
                    }
                } catch (e) {
                    // Ignore if user not found
                }
            }
        }
    });
};
