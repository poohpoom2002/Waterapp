/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';
import FloatingAiChat from './FloatingAiChat';
import axios from 'axios';

const Navbar: React.FC = () => {
    const { t } = useLanguage();
    const page = usePage();
    const auth = (page.props as any).auth;
    const [showFloatingAiChat, setShowFloatingAiChat] = useState(false);
    const [isAiChatMinimized, setIsAiChatMinimized] = useState(false);

    // State for token system
    const [tokenStatus, setTokenStatus] = useState<any>(null);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [showTokenPricingModal, setShowTokenPricingModal] = useState(false);

    // Set token status from user data for non-admin users
    useEffect(() => {
        if (!auth?.user || auth.user.is_super_user) {
            setTokenStatus(null);
            return; // Don't show tokens for super users
        }

        // Create token status from user data
        const userTokenStatus = {
            current_tokens: auth.user.tokens || 0,
            total_used: auth.user.total_tokens_used || 0,
            last_refresh: auth.user.last_token_refresh || null,
            refresh_count: auth.user.token_refresh_count || 0,
            is_super_user: auth.user.is_super_user || false,
            can_refresh: auth.user.can_refresh_tokens || false,
        };

        setTokenStatus(userTokenStatus);

        // Listen for token update events from other parts of the app
        const handleTokenUpdate = (event: any) => {
            setTokenStatus((prev) =>
                prev
                    ? {
                          ...prev,
                          current_tokens: event.detail.remaining,
                      }
                    : null
            );
        };

        window.addEventListener('tokensUpdated', handleTokenUpdate);

        return () => {
            window.removeEventListener('tokensUpdated', handleTokenUpdate);
        };
    }, [auth?.user]);

    // Function to refresh tokens
    const handleRefreshTokens = async () => {
        if (!auth?.user || auth.user.is_super_user) {
            return;
        }

        setLoadingTokens(true);
        try {
            const response = await axios.post('/api/tokens/refresh');
            if (response.data.success) {
                setTokenStatus(response.data.token_status);
                alert('Tokens refreshed successfully!');

                window.dispatchEvent(
                    new CustomEvent('tokensUpdated', {
                        detail: {
                            consumed: 0,
                            remaining: response.data.token_status.current_tokens,
                            operation: 'refresh',
                        },
                    })
                );
            } else {
                alert(response.data.message || 'Failed to refresh tokens');
            }
        } catch (error: any) {
            console.error('Error refreshing tokens:', error);
            alert(error.response?.data?.message || 'Failed to refresh tokens');
        } finally {
            setLoadingTokens(false);
        }
    };

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
        <>
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
                                    <h1 className="text-xl font-bold">
                                        {t('Chaiyo Irrigation Planning System')}
                                    </h1>
                                    <p className="text-sm">
                                        {t(
                                            'บจก.กนกโปรดักส์ จำกัด & บจก.ไชโยไปป์แอนด์ฟิตติ้ง จำกัด'
                                        )}
                                    </p>
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
                                    className="rounded-lg bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-green-600 hover:to-blue-600"
                                >
                                    🤖 {t('AI ช่วยเหลือ')}
                                </button>
                                <button
                                    onClick={() => (window.location.href = '/equipment-crud')}
                                    className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                                >
                                    ⚙️ {t('จัดการอุปกรณ์')}
                                </button>
                            </div>

                            {/* Token Display for Non-Admin Users */}
                            {auth?.user && !auth.user.is_super_user && (
                                <div className="flex items-center gap-2">
                                    {loadingTokens ? (
                                        <div className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-1 text-sm text-white">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            Loading...
                                        </div>
                                    ) : tokenStatus ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowTokenPricingModal(true)}
                                                className="flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                                title="Click to view token pricing and usage"
                                            >
                                                <span className="text-lg">🪙</span>
                                                <span>{tokenStatus.current_tokens}</span>
                                            </button>
                                            {tokenStatus.can_refresh && (
                                                <button
                                                    onClick={handleRefreshTokens}
                                                    className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                                                    title="Refresh tokens (once every 24 hours)"
                                                >
                                                    <span>🔄</span>
                                                    Refresh
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 rounded-lg bg-gray-600 px-3 py-1 text-sm text-white">
                                            <span className="text-lg">🪙</span>
                                            <span>--</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <LanguageSwitcher />

                            {/* User Avatar - Only show if authenticated */}
                            {auth?.user && (
                                <UserAvatar user={auth.user} size="md" className="ml-2" />
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Token Pricing Modal */}
            {showTokenPricingModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="relative z-[10000] max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-gray-900 p-8">
                        {/* Header */}
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="mb-2 text-3xl font-bold text-white">Token System</h2>
                                <p className="text-gray-400">Manage your tokens and view pricing</p>
                            </div>
                            <button
                                onClick={() => setShowTokenPricingModal(false)}
                                className="text-gray-400 transition-colors hover:text-white"
                            >
                                <svg
                                    className="h-8 w-8"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Token Packages */}
                        <div className="mb-8">
                            <h3 className="mb-4 text-xl font-semibold text-white">
                                Buy Token Packages
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {/* Starter Package */}
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center transition-colors hover:border-blue-500">
                                    <div className="mb-4">
                                        <div className="text-3xl font-bold text-blue-400">10</div>
                                        <div className="text-sm text-gray-400">Tokens</div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-2xl font-bold text-white">฿50</div>
                                        <div className="text-sm text-gray-400">฿5 per token</div>
                                    </div>
                                    <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                                        Buy Now
                                    </button>
                                </div>

                                {/* Popular Package */}
                                <div className="relative rounded-lg border-2 border-green-500 bg-gray-800 p-6 text-center">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                                        <span className="whitespace-nowrap rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                                            Most Popular
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-3xl font-bold text-green-400">50</div>
                                        <div className="text-sm text-gray-400">Tokens</div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-2xl font-bold text-white">฿200</div>
                                        <div className="text-sm text-gray-400">฿4 per token</div>
                                        <div className="text-xs text-green-400">Save ฿50</div>
                                    </div>
                                    <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                                        Buy Now
                                    </button>
                                </div>

                                {/* Premium Package */}
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center transition-colors hover:border-purple-500">
                                    <div className="mb-4">
                                        <div className="text-3xl font-bold text-purple-400">
                                            100
                                        </div>
                                        <div className="text-sm text-gray-400">Tokens</div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-2xl font-bold text-white">฿350</div>
                                        <div className="text-sm text-gray-400">฿3.5 per token</div>
                                        <div className="text-xs text-purple-400">Save ฿150</div>
                                    </div>
                                    <button className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700">
                                        Buy Now
                                    </button>
                                </div>
                            </div>

                            {/* Enterprise Package */}
                            <div className="mt-6 rounded-lg border border-yellow-500 bg-gray-800 p-6 text-center">
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-yellow-400">500</div>
                                    <div className="text-sm text-gray-400">Tokens</div>
                                </div>
                                <div className="mb-4">
                                    <div className="text-2xl font-bold text-white">฿1,500</div>
                                    <div className="text-sm text-gray-400">฿3 per token</div>
                                    <div className="text-xs text-yellow-400">
                                        Best Value - Save ฿1,000
                                    </div>
                                </div>
                                <button className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700">
                                    Buy Now
                                </button>
                            </div>
                        </div>

                        {/* Token System Info */}
                        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
                            <h3 className="mb-4 text-xl font-semibold text-white">
                                How Token System Works
                            </h3>
                            <div className="space-y-3 text-gray-300">
                                <div className="flex items-start gap-3">
                                    <span className="text-green-400">✅</span>
                                    <div>
                                        <strong>Starting Tokens:</strong> New users get 100 tokens
                                        to begin
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-400">🔄</span>
                                    <div>
                                        <strong>Daily Refresh:</strong> Get 50 free tokens every 24
                                        hours
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-purple-400">💳</span>
                                    <div>
                                        <strong>Buy More Tokens:</strong> Purchase additional tokens
                                        anytime with secure payment
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-yellow-400">👑</span>
                                    <div>
                                        <strong>Admin Users:</strong> Super users have unlimited
                                        access
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-orange-400">💡</span>
                                    <div>
                                        <strong>Smart Usage:</strong> Tokens are only consumed on
                                        successful operations
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Usage Statistics */}
                        {tokenStatus && (
                            <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-white">
                                    Your Usage Statistics
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-2xl font-bold text-blue-400">
                                            {tokenStatus.total_used || 0}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Total tokens used
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {tokenStatus.refresh_count || 0}
                                        </div>
                                        <div className="text-sm text-gray-400">Times refreshed</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
