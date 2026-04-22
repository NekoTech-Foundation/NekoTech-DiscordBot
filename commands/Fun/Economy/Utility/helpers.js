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

const getOutcomeLabel = (lang, didWin) => {
    const winLabel =
        lang?.Economy?.Messages?.win ??
        lang?.Economy?.Messages?.Win ??
        lang?.Economy?.Other?.win ??
        lang?.Economy?.Other?.Win ??
        lang?.Economy?.Bank?.win ??
        lang?.Economy?.Bank?.Win ??
        'Win';

    const loseLabel =
        lang?.Economy?.Messages?.lose ??
        lang?.Economy?.Messages?.Lose ??
        lang?.Economy?.Other?.lose ??
        lang?.Economy?.Other?.Lose ??
        lang?.Economy?.Bank?.lose ??
        lang?.Economy?.Bank?.Lose ??
        'Lose';

    return didWin ? winLabel : loseLabel;
};

module.exports = {
    checkActiveBooster,
    replacePlaceholders,
    getOutcomeLabel,
};