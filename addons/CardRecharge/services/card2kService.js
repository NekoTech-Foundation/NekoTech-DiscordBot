/**
 * Card2k API Service
 * Tích hợp với API Card2k.com để đổi thẻ cào
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Load configs
const addonConfigPath = path.join(__dirname, '../config.yml');
const mainConfigPath = path.join(__dirname, '../../../config.yml');

const addonConfig = yaml.load(fs.readFileSync(addonConfigPath, 'utf8'));
const mainConfig = yaml.load(fs.readFileSync(mainConfigPath, 'utf8'));

class Card2kService {
    constructor() {
        this.provider = addonConfig.provider || 'https://card2k.com';
        this.partnerId = mainConfig.API_Keys?.Card2k?.PartnerId || '';
        this.partnerKey = mainConfig.API_Keys?.Card2k?.PartnerKey || '';
    }

    /**
     * Tạo chữ ký MD5 cho request
     */
    generateSignature(code, serial) {
        const data = `${this.partnerKey}${code}${serial}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Lấy phí đổi thẻ cào
     */
    async getFees() {
        try {
            const url = `${this.provider}/chargingws/v2/getfee?partner_id=${this.partnerId}`;
            const response = await axios.get(url, {
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('[Card2kService] Lỗi khi lấy phí:', error.message);
            return null;
        }
    }

    /**
     * Gửi thẻ cào lên API
     * @param {Object} data - {telco, code, serial, amount, request_id}
     */
    async exchangeCard(data) {
        try {
            const url = `${this.provider}/chargingws/v2`;
            const sign = this.generateSignature(data.code, data.serial);

            const payload = {
                telco: data.telco,
                code: data.code,
                serial: data.serial,
                amount: data.amount,
                request_id: data.request_id,
                partner_id: this.partnerId,
                sign: sign,
                command: 'charging'
            };

            const response = await axios.post(url, payload, {
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('[Card2kService] Lỗi khi gửi thẻ:', error.message);
            if (error.response) {
                console.error('[Card2kService] Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Kiểm tra trạng thái thẻ đã gửi
     * @param {Object} data - {telco, code, serial, amount, request_id}
     */
    async checkCardStatus(data) {
        try {
            const url = `${this.provider}/chargingws/v2`;
            const sign = this.generateSignature(data.code, data.serial);

            const params = {
                telco: data.telco,
                code: data.code,
                serial: data.serial,
                amount: data.amount,
                request_id: data.request_id,
                partner_id: this.partnerId,
                sign: sign,
                command: 'check'
            };

            const response = await axios.get(url, {
                params: params,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('[Card2kService] Lỗi khi kiểm tra trạng thái:', error.message);
            return null;
        }
    }

    /**
     * Kiểm tra trạng thái API
     */
    async checkApiStatus() {
        try {
            const url = `${this.provider}/chargingws/v2/check-api`;
            const params = {
                partner_id: this.partnerId,
                partner_key: this.partnerKey
            };

            const response = await axios.get(url, {
                params: params,
                timeout: 10000
            });

            const data = response.data;

            if (data.status === 'success' && data.data && data.data.status === 'active') {
                return true;
            }

            console.error('[Card2kService] API không active:', data.message);
            return false;
        } catch (error) {
            console.error('[Card2kService] Lỗi khi kiểm tra API:', error.message);
            return false;
        }
    }

    /**
     * Parse fee data từ API response
     */
    parseFeeData(rawData) {
        if (!rawData || !rawData.data) {
            return null;
        }

        const result = {};

        for (const [telco, amounts] of Object.entries(rawData.data)) {
            if (typeof amounts === 'object') {
                // Tìm phí thấp nhất cho nhà mạng này
                const fees = Object.values(amounts).filter(fee => typeof fee === 'number');
                if (fees.length > 0) {
                    result[telco] = Math.min(...fees);
                }
            }
        }

        return result;
    }

    /**
     * Parse fee data cho một nhà mạng cụ thể
     */
    parseTelcoFeeData(rawData, telco) {
        if (!rawData || !rawData.data || !rawData.data[telco]) {
            return null;
        }

        const telcoData = rawData.data[telco];
        const result = {
            fees: {},
            minFee: null,
            minAmount: null
        };

        for (const [amount, fee] of Object.entries(telcoData)) {
            if (typeof fee === 'number') {
                result.fees[amount] = fee;

                if (result.minFee === null || fee < result.minFee) {
                    result.minFee = fee;
                    result.minAmount = parseInt(amount);
                }
            }
        }

        return result;
    }
}

module.exports = Card2kService;
