const UserData = require('../../models/UserData');

async function handleMessageCount(message) {
    if (message.author.bot || !message.guild) {
        return;
    }
    try {
        let userData = await UserData.findOne({ userId: message.author.id, guildId: message.guild.id });

        if (!userData) {
            userData = await UserData.create({
                userId: message.author.id,
                guildId: message.guild.id,
                xp: 0,
                level: 0,
                warns: 0,
                bans: 0,
                kicks: 0,
                timeouts: 0,
                note: "None",
                warnings: [],
                totalMessages: 1,
            });
        } else {
            userData.totalMessages++;
        }
        await userData.save();
    } catch (error) {
        console.error(`handleMessageCount: Error - ${error}`);
    }
}

module.exports = handleMessageCount;