import axios from 'axios';

function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = getCookie('XSRF-TOKEN');
    
    if (token) {
        config.headers['X-XSRF-TOKEN'] = token;
    } else {
    }
    
    return config;
}, (error) => {
    console.error('[CSRF] Request interceptor error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 403 && error.response?.data?.message === 'Invalid CSRF token') {
            console.error('[SECURITY] Access forbidden:', error.response.data);
            
            window.location.reload();
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

export default api; 