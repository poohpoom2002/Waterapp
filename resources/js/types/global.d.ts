import type { route as routeFn } from 'ziggy-js';

declare global {
    const route: typeof routeFn;
    namespace NodeJS {
        interface Timeout {}
    }
}

interface Window {
    Ziggy: {
        url: string;
        port: number | null;
        defaults: Record<string, any>;
        routes: Record<string, any>;
    };
}

export {};
