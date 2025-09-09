import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from './translations/index';

type Language = 'en' | 'th';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('th');

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
            setLanguage(savedLanguage);
        } else {
            setLanguage('th');
            localStorage.setItem('language', 'th');
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string): string => {
        // Logic การแปลยังเหมือนเดิม แต่ใช้ 'translations' ที่ import เข้ามา
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//     const [language, setLanguage] = useState<Language>('th');

//     useEffect(() => {
//         // Load language preference from localStorage
//         const savedLanguage = localStorage.getItem('language') as Language;
//         if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
//             setLanguage(savedLanguage);
//         } else {
//             // Set default to Thai if no saved preference
//             setLanguage('th');
//             localStorage.setItem('language', 'th');
//         }
//     }, []);

//     const handleSetLanguage = (lang: Language) => {
//         setLanguage(lang);
//         localStorage.setItem('language', lang);
//     };

//     const t = (key: string): string => {
//         return translations[language][key] || key;
//     };

//     return (
//         <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
//             {children}
//         </LanguageContext.Provider>
//     );
// };

// export const useLanguage = (): LanguageContextType => {
//     const context = useContext(LanguageContext);
//     if (context === undefined) {
//         throw new Error('useLanguage must be used within a LanguageProvider');
//     }
//     return context;
// };
