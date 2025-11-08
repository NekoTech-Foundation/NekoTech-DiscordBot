async function executeActions(functions, message) {
    const member = message.member;

    for (const func of functions) {
        if (func.name === 'add_role') {
            const role = message.guild.roles.cache.get(func.param);
            if (role) await member.roles.add(role).catch(console.error);
        }
        if (func.name === 'remove_role') {
            const role = message.guild.roles.cache.get(func.param);
            if (role) await member.roles.remove(role).catch(console.error);
        }
        if (func.name === 'react_trigger') {
            await message.react(func.param).catch(console.error);
        }
    }
}

async function executeChecks(functions, message) {
    const member = message.member;
    const channel = message.channel;

    for (const func of functions) {
        if (func.name === 'require_role') {
            if (!member.roles.cache.has(func.param)) return false;
        }
        if (func.name === 'ignore_user') {
            if (member.id === func.param) return false;
        }
        if (func.name === 'require_channel') {
            if (channel.id !== func.param) return false;
        }
        if (func.name === 'require_perm') {
            if (!member.permissions.has(func.param)) return false;
        }
        if (func.name === 'ignore_role') {
            if (member.roles.cache.has(func.param)) return false;
        }
        if (func.name === 'ignore_channel') {
            if (channel.id === func.param) return false;
        }
        if (func.name === 'ignore_perm') {
            if (member.permissions.has(func.param)) return false;
        }
    }
    return true;
}

function parseFunctions(text) {
    const functionRegex = /{(\w+)(?::([^}]+))?}/g;
    const functions = [];
    let match;
    let content = text;

    while ((match = functionRegex.exec(text)) !== null) {
        functions.push({
            name: match[1],
            param: match[2]
        });
        content = content.replace(match[0], '');
    }

    return { functions, content };
}

module.exports = { parseFunctions, executeChecks, executeActions };
