function parseDuration(durationStr) {
    const durationRegex = /(\d+)([smhd])/g;
    let match;
    let duration = 0;

    while ((match = durationRegex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                duration += value * 1000;
                break;
            case 'm':
                duration += value * 60 * 1000;
                break;
            case 'h':
                duration += value * 60 * 60 * 1000;
                break;
            case 'd':
                duration += value * 24 * 60 * 60 * 1000;
                break;
            default:
                break;
        }
    }

    return duration;
}

module.exports = parseDuration;