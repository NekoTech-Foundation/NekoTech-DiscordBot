const checkActiveBooster = (user, boosterType) => {
    if (!user || !Array.isArray(user.boosters)) {
        return 1.0;
    }
    const now = Date.now();
    const activeBooster = user.boosters.find(booster => booster.type === boosterType && booster.endTime > now);
    return activeBooster ? activeBooster.multiplier : 1.0;
};

const replacePlaceholders = (text, placeholders) => {
    return text.replace(/{(\w+)}/g, (_, key) => {
        return placeholders[key] !== undefined ? placeholders[key] : `{${key}}`;
    });
};

module.exports = {
    checkActiveBooster,
    replacePlaceholders,
};