/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';
import FloatingAiChat from './FloatingAiChat';

const Navbar: React.FC = () => {
    const { t } = useLanguage();
    const page = usePage();
    const auth = (page.props as any).auth;
    const [showFloatingAiChat, setShowFloatingAiChat] = useState(false);
    const [isAiChatMinimized, setIsAiChatMinimized] = useState(false);

    // ฟังก์ชันสำหรับเลื่อนไปยัง Footer
    // const scrollToFooter = () => {
    //     const footerElement = document.getElementById('contact-footer');
    //     if (footerElement) {
    //         footerElement.scrollIntoView({ 
    //             behavior: 'smooth', 
    //             block: 'start' 
    //         });
    //     }
    // };

    return (
        <nav className="border-b border-gray-700 bg-gray-800 shadow-lg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* App Name and Logo */}
                    <div className="flex items-center">
                        <Link
                            href="/"
                            className="flex items-center space-x-3 text-white transition-colors hover:text-green-300"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                                <img
                                    src="/images/chaiyo-logo.png"
                                    alt="logo"
                                    className="rounded-lg"
                                />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">{t('Chaiyo Irrigation System')}</h1>
                                <p className="text-sm">{t('บจก.กนกโปรดักส์ จำกัด & บจก.ไชโยไปป์แอนด์ฟิตติ้ง จำกัด')}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Right side - Language Switcher and User Avatar */}
                    <div className="flex items-center space-x-4">
                        {/* Super User Dashboard Link */}
                        {auth?.user?.is_super_user && (
                            <Link
                                href="/super/dashboard"
                                className="flex items-center rounded-lg bg-yellow-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-yellow-700"
                            >
                                <span className="text-lg">👑</span>
                                {t('Super Dashboard')}
                            </Link>
                        )}


                        <div className="flex items-center gap-3">
                            <FloatingAiChat
                                isOpen={showFloatingAiChat}
                                onClose={() => setShowFloatingAiChat(false)}
                                onMinimize={() => setIsAiChatMinimized(!isAiChatMinimized)}
                                isMinimized={isAiChatMinimized}
                            />
                            <button
                                onClick={() => setShowFloatingAiChat(true)}
                                className="rounded-lg bg-gradient-to-r text-white from-green-500 to-blue-500 px-4 py-2 text-sm font-medium transition-all hover:from-green-600 hover:to-blue-600"
                            >
                                🤖 {t('AI ช่วยเหลือ')}
                            </button>
                            <button
                                onClick={() => (window.location.href = '/equipment-crud')}
                                className="rounded-lg bg-gray-600 text-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
                            >
                                ⚙️ {t('จัดการอุปกรณ์')}
                            </button>
                        </div>
                        <LanguageSwitcher />


                        {/* User Avatar - Only show if authenticated */}
                        {auth?.user && <UserAvatar user={auth.user} size="md" className="ml-2" />}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;