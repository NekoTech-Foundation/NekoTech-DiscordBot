const { getConfig } = require('./configLoader');

async function createUnverifiedRoleIfNeeded(guild, verificationData) {
    const config = getConfig();
    if (!config.VerificationSettings?.Enabled || !config.VerificationSettings?.EnableUnverifiedRole) {
        return;
    }

    if (verificationData.unverifiedRoleID) {
        const existingRole = guild.roles.cache.get(verificationData.unverifiedRoleID);
        if (existingRole) {
            return;
        }
    }

    try {
        const unverifiedRole = await guild.roles.create({
            name: 'Unverified',
            color: '#FF5733',
            permissions: [],
            reason: 'Role for unverified members'
        });

        verificationData.unverifiedRoleID = unverifiedRole.id;
        await verificationData.save();
    } catch (error) {
        console.error(`[ERROR] Failed to create unverified role in guild ${guild.id}: `, error);
    }
}

module.exports = { createUnverifiedRoleIfNeeded };
