function parseTimeInterval(interval) {
    if (typeof interval === 'number') return interval;
    
    const regex = /(\d+)([mhd])/g;
    let total = 0;
    let match;

    while ((match = regex.exec(interval)) !== null) {
        const [_, value, unit] = match;
        const num = parseInt(value);
        switch(unit) {
            case 'm': total += num * 60000; break;
            case 'h': total += num * 3600000; break;
            case 'd': total += num * 86400000; break;
        }
    }

    return total || 300000;
}

module.exports = { parseTimeInterval };