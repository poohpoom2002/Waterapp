/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './resources/**/*.blade.php',
        './resources/**/*.js',
        './resources/**/*.jsx',
        './resources/**/*.ts',
        './resources/**/*.tsx',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Light mode colors - using hex values only
                border: '#e5e7eb',
                background: '#ffffff',
                foreground: '#111827',
                primary: {
                    DEFAULT: '#3b82f6',
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT: '#6b7280',
                    foreground: '#ffffff',
                },
                muted: {
                    DEFAULT: '#f9fafb',
                    foreground: '#6b7280',
                },
                accent: {
                    DEFAULT: '#f3f4f6',
                    foreground: '#111827',
                },
                destructive: {
                    DEFAULT: '#ef4444',
                    foreground: '#ffffff',
                },
                card: {
                    DEFAULT: '#ffffff',
                    foreground: '#111827',
                },
                popover: {
                    DEFAULT: '#ffffff',
                    foreground: '#111827',
                },
                // Dark mode colors - using hex values only
                'dark-border': '#374151',
                'dark-background': '#111827',
                'dark-foreground': '#f9fafb',
                'dark-primary': {
                    DEFAULT: '#3b82f6',
                    foreground: '#ffffff',
                },
                'dark-secondary': {
                    DEFAULT: '#6b7280',
                    foreground: '#ffffff',
                },
                'dark-muted': {
                    DEFAULT: '#1f2937',
                    foreground: '#9ca3af',
                },
                'dark-accent': {
                    DEFAULT: '#374151',
                    foreground: '#f9fafb',
                },
                'dark-destructive': {
                    DEFAULT: '#ef4444',
                    foreground: '#ffffff',
                },
                'dark-card': {
                    DEFAULT: '#1f2937',
                    foreground: '#f9fafb',
                },
                'dark-popover': {
                    DEFAULT: '#1f2937',
                    foreground: '#f9fafb',
                },
                // Chart colors
                'chart-1': '#f59e42',
                'chart-2': '#3b82f6',
                'chart-3': '#6366f1',
                'chart-4': '#fbbf24',
                'chart-5': '#f87171',
                // Sidebar colors
                'sidebar': '#f1f5f9',
                'sidebar-foreground': '#111827',
                'sidebar-primary': '#3b82f6',
                'sidebar-primary-foreground': '#ffffff',
                'sidebar-accent': '#f3f4f6',
                'sidebar-accent-foreground': '#111827',
                'sidebar-border': '#e5e7eb',
                'sidebar-ring': '#d1d5db',
                // Dark sidebar colors
                'dark-sidebar': '#1f2937',
                'dark-sidebar-foreground': '#f9fafb',
                'dark-sidebar-primary': '#3b82f6',
                'dark-sidebar-primary-foreground': '#ffffff',
                'dark-sidebar-accent': '#374151',
                'dark-sidebar-accent-foreground': '#f9fafb',
                'dark-sidebar-border': '#374151',
                'dark-sidebar-ring': '#6b7280',
            },
            animation: {
                'slide-in': 'slideIn 0.3s ease-out',
                'fade-in': 'fadeIn 0.5s ease-out',
                'bounce-in': 'bounceIn 0.6s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                slideIn: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0.3)', opacity: '0' },
                    '50%': { transform: 'scale(1.05)' },
                    '70%': { transform: 'scale(0.9)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}; 