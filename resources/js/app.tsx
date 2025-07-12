import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { initializeTheme } from './hooks/use-appearance';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';

const appName = import.meta.env.VITE_APP_NAME || 'WaterApp';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <ErrorBoundary>
                <LanguageProvider>
                    <App {...props} />
                </LanguageProvider>
            </ErrorBoundary>
        );
    },
    progress: {
        color: '#3B82F6',
    },
});

// This will set light / dark mode on load...
initializeTheme();
