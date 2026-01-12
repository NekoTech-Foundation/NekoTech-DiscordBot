try {
    require('./events/guildCreate.js');
    console.log('Syntax check passed for events/guildCreate.js');
} catch (error) {
    console.error('Syntax check failed:', error);
    process.exit(1);
}

try {
    require('./commands/Owner/testjoin.js');
    console.log('Syntax check passed for commands/Owner/testjoin.js');
} catch (error) {
    console.error('Syntax check failed:', error);
    process.exit(1);
}
