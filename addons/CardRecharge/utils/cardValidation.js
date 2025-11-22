/**
 * Card Validation Utilities
 * Kiểm tra tính hợp lệ của thẻ cào theo nhà mạng
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Load config
const configPath = path.join(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// Format dictionary cho từng nhà mạng
const FORMAT_DICT = {
    'viettel': { seri: [11, 14], pin: [13, 15] },
    'mobifone': { seri: [15], pin: [12] },
    'vinaphone': { seri: [14], pin: [14] },
    'vietnamobile': { seri: [16], pin: [12] },
    'vnmobi': { seri: [16], pin: [12] },
    'vnmb': { seri: [16], pin: [12] },
    'garena': { seri: [9], pin: [16] },
    'garena2': { seri: [9], pin: [16] },
    'zing': { seri: [12], pin: [9] },
    'vcoin': { seri: [12], pin: [12] },
    'gate': { seri: [10], pin: [10] },
    'appota': { seri: [12], pin: [12] }
};

/**
 * Kiểm tra nhà mạng có hợp lệ không
 * @param {string} telco - Tên nhà mạng
 * @returns {boolean}
 */
function validateTelco(telco) {
    const cardTypes = config.card_types || {};
    return cardTypes[telco.toLowerCase()] === true;
}

/**
 * Kiểm tra mệnh giá có hợp lệ cho nhà mạng không
 * @param {string} telco - Tên nhà mạng
 * @param {number} amount - Mệnh giá
 * @returns {boolean}
 */
function validateAmount(telco, amount) {
    const cardAmounts = config.card_amounts || {};
    const telcoAmounts = cardAmounts[telco.toLowerCase()] || {};
    return telcoAmounts[amount] === true;
}

/**
 * Kiểm tra mã thẻ và serial có hợp lệ không
 * @param {string} telco - Tên nhà mạng
 * @param {string} code - Mã thẻ
 * @param {string} serial - Serial thẻ
 * @returns {boolean}
 */
function validateCodeSerial(telco, code, serial) {
    const telcoUpper = telco.toUpperCase();
    const lengthSeri = serial.length;
    const lengthPin = code.length;

    // Kiểm tra nhà mạng có trong dictionary không
    if (!FORMAT_DICT[telco.toLowerCase()]) {
        return false;
    }

    // Kiểm tra code và serial chỉ chứa chữ và số
    if (!/^[a-zA-Z0-9]+$/.test(serial) || !/^[a-zA-Z0-9]+$/.test(code)) {
        return false;
    }

    // Lấy format của nhà mạng
    const format = FORMAT_DICT[telco.toLowerCase()];

    // Kiểm tra độ dài serial và pin
    const seriValid = format.seri.includes(lengthSeri);
    const pinValid = format.pin.includes(lengthPin);

    return seriValid && pinValid;
}

/**
 * Lấy danh sách nhà mạng được kích hoạt
 * @returns {Array<{name: string, value: string}>}
 */
function getActiveTelcos() {
    const cardTypes = config.card_types || {};
    return Object.entries(cardTypes)
        .filter(([_, enabled]) => enabled === true)
        .map(([telco]) => ({
            name: telco.charAt(0).toUpperCase() + telco.slice(1),
            value: telco
        }));
}

/**
 * Lấy danh sách mệnh giá được kích hoạt cho nhà mạng
 * @param {string} telco - Tên nhà mạng
 * @returns {Array<{name: string, value: number}>}
 */
function getActiveAmounts(telco) {
    const cardAmounts = config.card_amounts || {};
    const telcoAmounts = cardAmounts[telco.toLowerCase()] || {};

    return Object.entries(telcoAmounts)
        .filter(([_, enabled]) => enabled === true)
        .map(([amount]) => ({
            name: `${parseInt(amount).toLocaleString('vi-VN')} VNĐ`,
            value: parseInt(amount)
        }))
        .sort((a, b) => a.value - b.value);
}

module.exports = {
    validateTelco,
    validateAmount,
    validateCodeSerial,
    getActiveTelcos,
    getActiveAmounts,
    FORMAT_DICT
};
