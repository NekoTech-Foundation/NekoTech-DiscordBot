const axios = require('axios');

const API_BASE_URL = 'https://api.meobypass.click';

/**
 * Initiates the bypass process for a given URL.
 * @param {string} urlToBypass The shortlink URL to bypass.
 * @param {string} apiKey Your API key.
 * @returns {Promise<object>} The response from the API, containing the task_id.
 */
async function startBypass(urlToBypass, apiKey) {
    const endpoint = `${API_BASE_URL}/bypass`;
    try {
        const response = await axios.get(endpoint, {
            params: {
                url: urlToBypass,
                api_key: apiKey,
            },
        });
        return response.data;
    } catch (error) {
        console.error('MeoBypass API Error (startBypass):', error.response ? error.response.data : error.message);
        throw new Error('Failed to initiate bypass. Please check the URL and API key.');
    }
}

/**
 * Polls the task status to get the final bypassed URL.
 * @param {string} taskId The task ID received from startBypass.
 * @returns {Promise<object>} The response from the API, containing the status and result.
 */
async function getBypassResult(taskId) {
    const endpoint = `${API_BASE_URL}/taskid/${taskId}`;
    try {
        const response = await axios.get(endpoint);
        return response.data;
    } catch (error) {
        console.error('MeoBypass API Error (getBypassResult):', error.response ? error.response.data : error.message);
        throw new Error('Failed to get bypass result.');
    }
}

module.exports = {
    startBypass,
    getBypassResult,
};
