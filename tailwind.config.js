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
                // Override สีหลักให้เป็น rgb/hsl ที่ html2canvas รองรับ
                gray: {
                    50:  '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: 'rgb(31,41,55)',
                    900: '#111827',
                },
                blue: {
                    50:  '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
                red: {
                    500: '#ef4444',
                    600: '#dc2626',
                },
                green: {
                    400: '#22c55e',
                    500: '#16a34a',
                },
                yellow: {
                    400: '#facc15',
                    600: '#ca8a04',
                },
                purple: {
                    600: '#8b5cf6',
                    900: '#6d28d9',
                },
                white: '#ffffff',
                black: '#000000',
                // Light mode colors - using hex values only
                border: '#e5e7eb',
                background: '#ffffff',
                foreground: '#111827',
                primary: {
                    DEFAULT: '#3b82f6',
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT: '#facc15',
                    foreground: '#000000',
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