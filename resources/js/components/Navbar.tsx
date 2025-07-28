import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';

const Navbar: React.FC = () => {
    useLanguage();
    const page = usePage();
    const auth = (page.props as any).auth;

    return (
        <nav className="border-b border-gray-700 bg-gray-800 shadow-lg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* App Name and Logo */}
                    <div className="flex items-center">
                        <Link
                            href="/"
                            className="flex items-center space-x-3 text-white transition-colors hover:text-gray-300"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                                <span className="text-xl font-bold">💧</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Chaiyo Water App</h1>
                            </div>
                        </Link>
                    </div>

                    {/* Right side - Language Switcher and User Avatar */}
                    <div className="flex items-center space-x-4">
                        {/* Super User Dashboard Link */}
                        {auth?.user?.is_super_user && (
                            <Link
                                href="/super/dashboard"
                                className="flex items-center gap-2 rounded-lg bg-yellow-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700"
                            >
                                <span className="text-lg">👑</span>
                                Super Dashboard
                            </Link>
                        )}

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
