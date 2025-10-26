const Ticket = require('../../models/tickets');

module.exports = async function handleTicketAlertReset(message) {
    const ticket = await Ticket.findOne({ channelId: message.channel.id, status: 'open' });

    if (ticket && message.author.id === ticket.userId) {
        ticket.alertTime = null;
        if (ticket.alertMessageId) {
            const alertMessage = await message.channel.messages.fetch(ticket.alertMessageId).catch(() => null);
            if (alertMessage) {
                try {
                    await alertMessage.delete();
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Failed to delete alert message:', error);
                    }
                }
            }
            ticket.alertMessageId = null;
        }
        await ticket.save();
    }
}