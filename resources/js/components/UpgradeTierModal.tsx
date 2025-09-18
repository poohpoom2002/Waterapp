import React, { useState } from 'react';

interface UpgradeTierModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTier: string;
    onUpgrade: (tier: string, months: number) => void;
}

const UpgradeTierModal: React.FC<UpgradeTierModalProps> = ({
    isOpen,
    onClose,
    currentTier,
    onUpgrade,
}) => {
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [selectedMonths, setSelectedMonths] = useState<number>(1);

    if (!isOpen) return null;

    const tiers = [
        {
            id: 'free',
            name: 'Free',
            price: 0,
            monthlyTokens: 100,
            features: [
                '100 tokens per month',
                'Basic irrigation planning',
                'Standard support',
                'Limited AI features',
            ],
            color: 'gray',
            popular: false,
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 299,
            monthlyTokens: 500,
            features: [
                '500 tokens per month',
                'Advanced irrigation planning',
                'Priority support',
                'Full AI features',
                'Export capabilities',
                'Advanced analytics',
            ],
            color: 'blue',
            popular: true,
        },
        {
            id: 'advanced',
            name: 'Advanced',
            price: 599,
            monthlyTokens: 1000,
            features: [
                '1000 tokens per month',
                'Premium irrigation planning',
                '24/7 priority support',
                'All AI features',
                'Unlimited exports',
                'Advanced analytics',
                'Custom integrations',
                'API access',
            ],
            color: 'purple',
            popular: false,
        },
    ];

    const getTierColor = (color: string) => {
        switch (color) {
            case 'blue':
                return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-600',
                    hover: 'hover:bg-blue-700',
                    text: 'text-blue-400',
                };
            case 'purple':
                return {
                    border: 'border-purple-500',
                    bg: 'bg-purple-600',
                    hover: 'hover:bg-purple-700',
                    text: 'text-purple-400',
                };
            default:
                return {
                    border: 'border-gray-500',
                    bg: 'bg-gray-600',
                    hover: 'hover:bg-gray-700',
                    text: 'text-gray-400',
                };
        }
    };

    const handleUpgrade = () => {
        if (selectedTier && selectedTier !== 'free') {
            onUpgrade(selectedTier, selectedMonths);
            onClose();
        }
    };

    const getTotalPrice = (tier: any, months: number) => {
        if (tier.id === 'free') return 0;
        return tier.price * months;
    };

    const getDiscount = (tier: any, months: number) => {
        if (tier.id === 'free' || months === 1) return 0;
        const monthlyPrice = tier.price;
        const totalPrice = monthlyPrice * months;
        const discount = Math.floor(totalPrice * 0.1); // 10% discount for multi-month
        return discount;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="relative z-[10000] max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-gray-900 p-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="mb-2 text-3xl font-bold text-white">Upgrade Your Plan</h2>
                        <p className="text-gray-400">
                            Choose the perfect plan for your irrigation needs
                        </p>
                    </div>
                    <button
                        onClick={onClose}
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

                {/* Current Tier Info */}
                <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
                    <h3 className="mb-2 text-lg font-semibold text-white">Current Plan</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🆓</span>
                        <div>
                            <div className="text-xl font-bold text-white">
                                {tiers.find((t) => t.id === currentTier)?.name || 'Free'}
                            </div>
                            <div className="text-sm text-gray-400">
                                {tiers.find((t) => t.id === currentTier)?.monthlyTokens || 100}{' '}
                                tokens per month
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tier Selection */}
                <div className="mb-8">
                    <h3 className="mb-4 text-xl font-semibold text-white">Choose Your Plan</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {tiers.map((tier) => {
                            const colors = getTierColor(tier.color);
                            const isSelected = selectedTier === tier.id;
                            const isCurrentTier = currentTier === tier.id;
                            const totalPrice = getTotalPrice(tier, selectedMonths);
                            const discount = getDiscount(tier, selectedMonths);

                            return (
                                <div
                                    key={tier.id}
                                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                                        isSelected
                                            ? `${colors.border} bg-gray-800`
                                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                    } ${isCurrentTier ? 'opacity-50' : ''}`}
                                    onClick={() => !isCurrentTier && setSelectedTier(tier.id)}
                                >
                                    {tier.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                                            <span className="whitespace-nowrap rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}

                                    {isCurrentTier && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                                            <span className="whitespace-nowrap rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
                                                Current Plan
                                            </span>
                                        </div>
                                    )}

                                    <div className="text-center">
                                        <div className="mb-4">
                                            <div className="text-3xl font-bold text-white">
                                                {tier.name}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                {tier.monthlyTokens} tokens/month
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <div className="text-2xl font-bold text-white">
                                                ฿{tier.price}
                                            </div>
                                            <div className="text-sm text-gray-400">per month</div>
                                        </div>

                                        <div className="space-y-2 text-left">
                                            {tier.features.map((feature, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 text-sm text-gray-300"
                                                >
                                                    <svg
                                                        className="h-4 w-4 flex-shrink-0 text-green-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>

                                        {isCurrentTier ? (
                                            <button
                                                disabled
                                                className="mt-6 w-full cursor-not-allowed rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-gray-400"
                                            >
                                                Current Plan
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedTier(tier.id)}
                                                className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                                                    isSelected
                                                        ? `${colors.bg} ${colors.hover}`
                                                        : 'bg-gray-600 hover:bg-gray-700'
                                                }`}
                                            >
                                                {isSelected ? 'Selected' : 'Select Plan'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Billing Period */}
                {selectedTier && selectedTier !== 'free' && (
                    <div className="mb-8">
                        <h3 className="mb-4 text-xl font-semibold text-white">Billing Period</h3>
                        <div className="flex gap-4">
                            {[1, 3, 6, 12].map((months) => {
                                const tier = tiers.find((t) => t.id === selectedTier);
                                const totalPrice = getTotalPrice(tier!, months);
                                const discount = getDiscount(tier!, months);
                                const finalPrice = totalPrice - discount;

                                return (
                                    <button
                                        key={months}
                                        onClick={() => setSelectedMonths(months)}
                                        className={`rounded-lg border-2 p-4 text-center transition-all ${
                                            selectedMonths === months
                                                ? 'border-blue-500 bg-blue-900/20'
                                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="text-lg font-bold text-white">
                                            {months} {months === 1 ? 'Month' : 'Months'}
                                        </div>
                                        <div className="text-sm text-gray-400">฿{finalPrice}</div>
                                        {discount > 0 && (
                                            <div className="text-xs text-green-400">
                                                Save ฿{discount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Price Summary */}
                {selectedTier && selectedTier !== 'free' && (
                    <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
                        <h3 className="mb-4 text-xl font-semibold text-white">Order Summary</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-gray-300">
                                <span>
                                    {tiers.find((t) => t.id === selectedTier)?.name} Plan (
                                    {selectedMonths} {selectedMonths === 1 ? 'month' : 'months'})
                                </span>
                                <span>
                                    ฿
                                    {getTotalPrice(
                                        tiers.find((t) => t.id === selectedTier)!,
                                        selectedMonths
                                    )}
                                </span>
                            </div>
                            {getDiscount(
                                tiers.find((t) => t.id === selectedTier)!,
                                selectedMonths
                            ) > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>Multi-month discount (10%)</span>
                                    <span>
                                        -฿
                                        {getDiscount(
                                            tiers.find((t) => t.id === selectedTier)!,
                                            selectedMonths
                                        )}
                                    </span>
                                </div>
                            )}
                            <div className="border-t border-gray-700 pt-2">
                                <div className="flex justify-between text-lg font-bold text-white">
                                    <span>Total</span>
                                    <span>
                                        ฿
                                        {getTotalPrice(
                                            tiers.find((t) => t.id === selectedTier)!,
                                            selectedMonths
                                        ) -
                                            getDiscount(
                                                tiers.find((t) => t.id === selectedTier)!,
                                                selectedMonths
                                            )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-600 px-6 py-3 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                        Cancel
                    </button>
                    {selectedTier && selectedTier !== 'free' && (
                        <button
                            onClick={handleUpgrade}
                            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                            Upgrade to {tiers.find((t) => t.id === selectedTier)?.name}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpgradeTierModal;
