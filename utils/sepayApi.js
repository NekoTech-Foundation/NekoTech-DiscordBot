const axios = require('axios');

/**
 * Fetch list of bank accounts from SePay
 * @param {string} apiKey - The SePay API Key (Bearer Token)
 * @returns {Promise<Array>} List of bank accounts or throws error
 */
async function fetchSePayBankAccounts(apiKey) {
    try {
        const response = await axios.get('https://my.sepay.vn/userapi/bankaccounts/list', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.status === 200 && response.data.bankaccounts) {
            return response.data.bankaccounts;
        } else {
            throw new Error(response.data?.messages?.success === false ? 'API Error' : 'Invalid Response');
        }
    } catch (error) {
        console.error('[SePay API] Error fetching bank accounts:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { fetchSePayBankAccounts };
