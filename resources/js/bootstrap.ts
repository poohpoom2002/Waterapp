import axios from 'axios';
import { Ziggy } from './ziggy';

// Set up axios defaults
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.withCredentials = true;

// Set up axios base URL
axios.defaults.baseURL = import.meta.env.VITE_APP_URL || '';

// Set up CSRF token
const token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    const tokenValue = token.getAttribute('content');
    axios.defaults.headers.common['X-CSRF-TOKEN'] = tokenValue;
    console.log('CSRF Token set:', tokenValue ? 'Present' : 'Missing');
} else {
    console.warn('CSRF Token meta tag not found');
}

// Function to update CSRF token from Inertia props
export const updateCsrfTokenFromProps = (token: string) => {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    const metaTag = document.head.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        metaTag.setAttribute('content', token);
    }
    console.log('CSRF Token updated from props');
};

// Set up Ziggy routes
if (typeof Ziggy !== 'undefined') {
    (window as typeof window & { Ziggy: typeof Ziggy }).Ziggy = Ziggy;
}

// Function to refresh CSRF token
export const refreshCsrfToken = async () => {
    try {
        const response = await axios.get('/csrf-token');
        if (response.data.token) {
            axios.defaults.headers.common['X-CSRF-TOKEN'] = response.data.token;
            // Update the meta tag as well
            const metaTag = document.head.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                metaTag.setAttribute('content', response.data.token);
            }
            console.log('CSRF Token refreshed successfully');
            return response.data.token;
        }
    } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
    }
    return null;
};

// Function to handle CSRF token mismatch errors
export const handleCsrfError = async (error: any) => {
    if (error.response?.status === 419 || error.response?.data?.message?.includes('CSRF')) {
        console.log('CSRF token mismatch detected, refreshing token...');
        const newToken = await refreshCsrfToken();
        if (newToken) {
            console.log('CSRF token refreshed, you can retry the request');
            return true;
        }
    }
    return false;
};

// Function to get CSRF token from meta tag
export const getCsrfToken = () => {
    const token = document.head.querySelector('meta[name="csrf-token"]');
    return token ? token.getAttribute('content') : null;
};

// Function to update CSRF token in axios headers
export const updateCsrfToken = (token: string) => {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    const metaTag = document.head.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        metaTag.setAttribute('content', token);
    }
};

// Add axios response interceptor to handle CSRF token mismatches
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If it's a CSRF token mismatch and we haven't already retried
        if ((error.response?.status === 419 || error.response?.data?.message?.includes('CSRF')) 
            && !originalRequest._retry) {
            
            originalRequest._retry = true;
            console.log('CSRF token mismatch detected, refreshing token and retrying...');
            
            try {
                const newToken = await refreshCsrfToken();
                if (newToken) {
                    // Update the original request with the new token
                    originalRequest.headers['X-CSRF-TOKEN'] = newToken;
                    // Retry the original request
                    return axios(originalRequest);
                }
            } catch (refreshError) {
                console.error('Failed to refresh CSRF token:', refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);
