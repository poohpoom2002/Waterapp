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
            console.log('CSRF Token refreshed');
            return response.data.token;
        }
    } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
    }
    return null;
};
