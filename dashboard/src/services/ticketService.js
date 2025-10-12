import axios from 'axios';

const API_URL = window.DASHBOARD_CONFIG?.API_URL || 'http://localhost:3000/api';
const TICKETS_URL = `${API_URL}/tickets`;

const getCSRFToken = () => {
    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for(let cookie of cookieArray) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
};

const formatErrorInfo = (error) => {
    return {
        url: error.config?.url || 'Unknown URL',
        method: error.config?.method?.toUpperCase() || 'Unknown Method',
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.details || error.response?.data?.error || error.message,
        timestamp: new Date().toISOString()
    };
};

axios.interceptors.request.use((config) => {
    config.withCredentials = true;
    
    const csrfToken = getCSRFToken();
    if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
    }

    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
    }

    return config;
});

axios.interceptors.response.use(
    (response) => {
        const sessionId = response.headers['x-session-id'];
        if (sessionId) {
            sessionStorage.setItem('sessionId', sessionId);
        }
        return response;
    },
    (error) => {
        const errorInfo = formatErrorInfo(error);

        if (error.response?.status === 401) {
            console.error('[SECURITY] Authentication failed:', errorInfo);
            sessionStorage.removeItem('sessionId');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            console.error('[SECURITY] Access forbidden:', errorInfo);
        } else if (error.response?.status === 429) {
            console.error('[SECURITY] Rate limit exceeded:', errorInfo);
        } else {
            console.error('[ERROR] Request failed:', errorInfo, {
                fullError: error,
                requestHeaders: error.config?.headers
            });
        }

        return Promise.reject(error);
    }
);

export const ticketService = {
    async getDashboardData() {
        const response = await axios.get(`${TICKETS_URL}/dashboard`, {
            withCredentials: true
        });
        return response.data;
    },

    async getTickets(filters, page = 1) {
        const params = new URLSearchParams({
            ...filters,
            page: page.toString(),
            limit: filters.limit?.toString() || '10'
        });
        const response = await axios.get(`${TICKETS_URL}/list?${params}`, {
            withCredentials: true
        });
        return response.data;
    },

    async getFilterOptions() {
        const response = await axios.get(`${TICKETS_URL}/list?limit=1`, {
            withCredentials: true
        });
        return response.data.filters;
    },

    async getTicket(id) {
        const response = await axios.get(`${TICKETS_URL}/${id}`, {
            withCredentials: true
        });
        return response.data;
    },

    async createTicket(ticketData) {
        const response = await axios.post(TICKETS_URL, ticketData);
        return response.data;
    },

    async updateTicket(id, updateData) {
        const response = await axios.patch(`${TICKETS_URL}/${id}`, updateData);
        return response.data;
    },

    async deleteTicket(id) {
        const response = await axios.delete(`${TICKETS_URL}/${id}`);
        return response.data;
    },

    async closeTicket(id) {
        const response = await axios.post(`${TICKETS_URL}/${id}/close`);
        return response.data;
    }
};

export default ticketService;