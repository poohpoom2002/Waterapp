import React, { createContext, useContext, useState, ReactNode } from 'react';
import { languages, Language } from '../config/languages';

interface LanguageContextType {
    currentLanguage: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

    const setLanguage = (lang: Language) => {
        setCurrentLanguage(lang);
    };

    const t = (key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let value: any = languages[currentLanguage];

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }

        if (typeof value !== 'string') return key;

        if (params) {
            return Object.entries(params).reduce((str, [key, val]) => {
                return str.replace(`{${key}}`, String(val));
            }, value);
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
