const { Client, Intents } = require('discord.js');
const math = require('mathjs');

const COUNTING_CHANNEL_ID = '1427638990449934488';
const TICK_REACTION = '<:drakotick:1216034103502311526>';
const XICON_REACTION = '<:XIcon:1244755723804606627>';

let currentCount = 1;
let lastUserId = null;

function evaluateExpression(content) {
    try {
        const expression = content.replace(/ln/g, 'log');
        const result = math.evaluate(expression);
        if (!Number.isInteger(result)) throw new Error('Not an integer');
        return result;
    } catch {
        return null;
    }
}

async function updateCurrentCount(channel) {
    const messages = await channel.messages.fetch({ limit: 50, cache: true });
    for (const message of messages.values()) {
        const number = evaluateExpression(message.content);
        if (number !== null && Number.isInteger(number)) {
            currentCount = number + 1;
            lastUserId = message.author.id;
            return;
        }
    }
    currentCount = 1;
    lastUserId = null;
}

module.exports.run = async (client) => {
    client.on('ready', async () => {
        console.log("Counting addon is ready!");
        const countingChannel = client.channels.cache.get(COUNTING_CHANNEL_ID);
        if (countingChannel) {
            await updateCurrentCount(countingChannel);
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot || message.channel.id !== COUNTING_CHANNEL_ID) return;

        const userNumber = evaluateExpression(message.content);

        if (userNumber === null) {
            await message.delete();
            return;
        }

        if (message.author.id === lastUserId) {
            await message.delete();
            return;
        }

        if (userNumber === currentCount) {
            lastUserId = message.author.id;
            currentCount++;
            await message.react(TICK_REACTION);
        } else {
            await message.react(XICON_REACTION);
            await message.channel.send(`Incorrect number! The next number is 1.`);
            currentCount = 1;
            lastUserId = null;
        }
    });

    client.on('messageDelete', async message => {
        if (message.channel.id !== COUNTING_CHANNEL_ID) return;

        const countingChannel = client.channels.cache.get(COUNTING_CHANNEL_ID);
        if (countingChannel) {
            await updateCurrentCount(countingChannel);
        }
    });
};