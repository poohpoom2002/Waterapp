// resources/js/utils/logger.ts
const isDevelopment = import.meta.env.DEV;

export class Logger {
    private static isEnabled = isDevelopment;

    static enable() {
        this.isEnabled = true;
    }

    static disable() {
        this.isEnabled = false;
    }

    static log(...args: any[]) {
        if (this.isEnabled) {
            console.log(...args);
        }
    }

    static warn(...args: any[]) {
        if (this.isEnabled) {
            console.warn(...args);
        }
    }

    static error(...args: any[]) {
        if (this.isEnabled) {
            console.error(...args);
        }
    }

    static info(...args: any[]) {
        if (this.isEnabled) {
            console.info(...args);
        }
    }

    static debug(...args: any[]) {
        if (this.isEnabled) {
            console.debug(...args);
        }
    }

    static group(label: string) {
        if (this.isEnabled) {
            console.group(label);
        }
    }

    static groupEnd() {
        if (this.isEnabled) {
            console.groupEnd();
        }
    }

    static table(data: any) {
        if (this.isEnabled) {
            console.table(data);
        }
    }

    static time(label: string) {
        if (this.isEnabled) {
            console.time(label);
        }
    }

    static timeEnd(label: string) {
        if (this.isEnabled) {
            console.timeEnd(label);
        }
    }
}

// Export convenient aliases
export const logger = Logger;
export const log = Logger.log;
export const warn = Logger.warn;
export const error = Logger.error;
export const info = Logger.info;
export const debug = Logger.debug;
