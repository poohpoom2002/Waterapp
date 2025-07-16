import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';

const Navbar: React.FC = () => {
    const { t } = useLanguage();
    const page = usePage();
    const auth = (page.props as any).auth;

    return (
        <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* App Name and Logo */}
                    <div className="flex items-center">
                        <Link 
                            href="/" 
                            className="flex items-center space-x-3 text-white hover:text-gray-300 transition-colors"
                        >
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg">
                                <span className="text-xl font-bold">💧</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Chaiyo Water App</h1>
                            </div>
                        </Link>
                    </div>

                    {/* Right side - Language Switcher and User Avatar */}
                    <div className="flex items-center space-x-4">
                        <LanguageSwitcher />
                        
                        {/* User Avatar - Only show if authenticated */}
                        {auth?.user && (
                            <UserAvatar 
                                user={auth.user} 
                                size="md"
                                className="ml-2"
                            />
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar; 