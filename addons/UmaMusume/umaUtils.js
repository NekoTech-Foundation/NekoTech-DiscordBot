const EconomyUserData = require('../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

let config = {};
try {
  const configPath = path.join(__dirname, 'config.yml');
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error(`Error loading Uma Musume umaUtils config.yml: ${e}`);
}

const conversionRate = config.coin_to_carrot_rate || 10;

async function convertCoinsToCarrots(userId, amount) {
  const session = await EconomyUserData.startSession();
  session.startTransaction();
  try {
    let playerEconomy = await EconomyUserData.findOne({ userId: userId }).session(session);

    if (!playerEconomy) {
      playerEconomy = new EconomyUserData({ userId: userId });
    }

    if (playerEconomy.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, error: `Bạn không có đủ coin. Bạn có ${playerEconomy.balance} coin.` };
    }

    const carrotsToAdd = Math.floor(amount / conversionRate);

    playerEconomy.balance -= amount;
    playerEconomy.carrots += carrotsToAdd;

    await playerEconomy.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      carrots: carrotsToAdd,
      newBalance: playerEconomy.balance,
      newCarrots: playerEconomy.carrots
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Lỗi khi đổi coin sang cà rốt:', error);
    return { success: false, error: 'Đã xảy ra lỗi trong quá trình giao dịch.' };
  }
}

module.exports = {
  convertCoinsToCarrots,
};
