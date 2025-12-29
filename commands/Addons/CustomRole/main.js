const CustomRole = require('../../../models/CustomRole');
const CustomRoleSettings = require('../../../models/CustomRoleSettings');

module.exports = {
    onLoad: (client) => {
        console.log('CustomRole addon loaded.');
        setInterval(async () => {
            const expiredRoles = await CustomRole.find({ expiresAt: { $ne: null, $lte: new Date() } });

            for (const customRole of expiredRoles) {
                const guild = await client.guilds.fetch(customRole.guildId);
                if (!guild) continue;

                const role = await guild.roles.fetch(customRole.roleId);
                if (!role) {
                    await CustomRole.deleteOne({ _id: customRole._id });
                    continue;
                }

                const settings = await CustomRoleSettings.findOne({ guildId: customRole.guildId });
                const action = settings ? settings.onExpireAction : 'removeMembers';

                if (action === 'deleteRole') {
                    await role.delete();
                } else { // removeMembers
                    role.members.forEach(member => member.roles.remove(role));
                }

                await CustomRole.deleteOne({ _id: customRole._id });
            }
        }, 60 * 1000); // Check every minute
    }
};
