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
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token.getAttribute('content');
}

// Set up Ziggy routes
if (typeof Ziggy !== 'undefined') {
    (window as any).Ziggy = Ziggy;
}
