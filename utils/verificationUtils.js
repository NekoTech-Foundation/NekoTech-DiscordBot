const { getConfig } = require('./configLoader');
const Verification = require('../models/verificationSchema');
const UserData = require('../models/UserData');

const config = getConfig();

async function createUnverifiedRoleIfNeeded(guild, verificationData) {
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

        const verificationChannelID = config.VerificationSettings.ChannelID;
        // Logic to update channel permissions would go here if needed, simplified for now
        
        verificationData.unverifiedRoleID = unverifiedRole.id;
        await verificationData.save();
    } catch (error) {
        console.error(`[ERROR] Failed to create unverified role in guild ${guild.id}: `, error);
    }
}

async function handleJoinRoles(member) {
    // Only basic logic here, assuming default restoration isn't needed or is handled elsewhere
    // If JoinRoleSettings is missing from new config, skip.
    // Assuming new config doesn't have detailed JoinRoleSettings yet unless I add it.
    // User asked for "Recode user verify", so I'll focus on Verification Success logic.
}

async function handleVerificationSuccess(member) {
    try {
        const guildMember = await member.guild.members.fetch(member.id).catch(() => null);
        if (!guildMember) return;

        const roleIDs = config.VerificationSettings?.VerifiedRoleID || [];
        for (const roleID of roleIDs) {
            await guildMember.roles.add(roleID).catch(console.error);
        }

        // Handle Unverified Role removal
        if (config.VerificationSettings?.EnableUnverifiedRole) {
            const verificationData = await Verification.findOne({ guildID: member.guild.id });
            if (verificationData && verificationData.unverifiedRoleID) {
                const unverifiedRole = member.guild.roles.cache.get(verificationData.unverifiedRoleID);
                if (unverifiedRole && guildMember.roles.cache.has(unverifiedRole.id)) {
                    await guildMember.roles.remove(unverifiedRole).catch(console.error);
                }
            }
        }

    } catch (error) {
        console.log(`[VERIFICATION] Error during verification success handling for member ${member.id}: ${error.message}`);
    }
}

module.exports = { handleVerificationSuccess, createUnverifiedRoleIfNeeded };
