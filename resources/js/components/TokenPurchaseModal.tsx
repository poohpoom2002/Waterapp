import React, { useState } from 'react';
import { FaTimes, FaCoins, FaCheck } from 'react-icons/fa';

interface TokenPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    planType: 'pro' | 'advanced';
    months: number;
    tokenCost: number;
    userTokens: number;
    onSubmit: (purchaseData: {
        plan_type: string;
        months: number;
    }) => void;
    onBuyTokens?: (purchaseData: {
        plan_type: string;
        months: number;
        payment_proof: string;
        notes: string;
    }) => void;
}

export default function TokenPurchaseModal({
    isOpen,
    onClose,
    planType,
    months,
    tokenCost,
    userTokens,
    onSubmit,
    onBuyTokens
}: TokenPurchaseModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBuyTokensForm, setShowBuyTokensForm] = useState(false);
    const [paymentProof, setPaymentProof] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (userTokens < tokenCost) {
            alert('Insufficient tokens to purchase this plan');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                plan_type: planType,
                months: months
            });
            onClose();
        } catch (error) {
            console.error('Error purchasing plan:', error);
            alert('Error purchasing plan. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuyTokens = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!paymentProof.trim()) {
            alert('Please provide payment proof');
            return;
        }

        setIsSubmitting(true);
        try {
            if (onBuyTokens) {
                await onBuyTokens({
                    plan_type: planType,
                    months: months,
                    payment_proof: paymentProof,
                    notes: notes
                });
                onClose();
            }
        } catch (error) {
            console.error('Error submitting payment request:', error);
            alert('Error submitting payment request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canAfford = userTokens >= tokenCost;
    const remainingTokens = userTokens - tokenCost;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Purchase Plan with Tokens</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-6 rounded-lg bg-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <FaCoins className="h-6 w-6 text-yellow-400" />
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {planType === 'pro' ? 'Pro Plan' : 'Advanced Plan'}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {months} month{months > 1 ? 's' : ''} subscription
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-yellow-400">{tokenCost.toLocaleString()}</div>
                            <div className="text-sm text-gray-400">Tokens Required</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{userTokens.toLocaleString()}</div>
                            <div className="text-sm text-gray-400">Your Tokens</div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6 space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700">
                            <span className="text-gray-300">Plan Cost:</span>
                            <span className="text-yellow-400 font-semibold">{tokenCost.toLocaleString()} tokens</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700">
                            <span className="text-gray-300">Your Tokens:</span>
                            <span className="text-blue-400 font-semibold">{userTokens.toLocaleString()} tokens</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700">
                            <span className="text-gray-300">After Purchase:</span>
                            <span className={`font-semibold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                {remainingTokens.toLocaleString()} tokens
                            </span>
                        </div>
                    </div>

                    {!canAfford && (
                        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-600 p-3">
                            <div className="flex items-start gap-2">
                                <FaTimes className="h-4 w-4 text-red-400 mt-0.5" />
                                <div className="text-sm text-red-200">
                                    <p className="font-medium">Insufficient Tokens</p>
                                    <p>You need {tokenCost.toLocaleString()} tokens but only have {userTokens.toLocaleString()} tokens.</p>
                                    <p className="mt-1">You need {(tokenCost - userTokens).toLocaleString()} more tokens to purchase this plan.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {canAfford && (
                        <div className="mb-4 rounded-lg bg-green-900/30 border border-green-600 p-3">
                            <div className="flex items-start gap-2">
                                <FaCheck className="h-4 w-4 text-green-400 mt-0.5" />
                                <div className="text-sm text-green-200">
                                    <p className="font-medium">Purchase Confirmed</p>
                                    <p>You have enough tokens to purchase this plan.</p>
                                    <p className="mt-1">You will have {remainingTokens.toLocaleString()} tokens remaining after purchase.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showBuyTokensForm ? (
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                            >
                                Cancel
                            </button>
                            {!canAfford && onBuyTokens && (
                                <button
                                    type="button"
                                    onClick={() => setShowBuyTokensForm(true)}
                                    className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 flex items-center gap-2"
                                >
                                    💳 Buy Tokens with Money
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={!canAfford || isSubmitting}
                                className="rounded bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        Purchasing...
                                    </>
                                ) : (
                                    <>
                                        <FaCoins className="h-4 w-4" />
                                        Purchase with Tokens
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Payment Proof (Transaction ID, Screenshot, etc.)
                                </label>
                                <textarea
                                    value={paymentProof}
                                    onChange={(e) => setPaymentProof(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                    placeholder="Enter payment proof or transaction details..."
                                    rows={3}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                    placeholder="Any additional information..."
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBuyTokensForm(false)}
                                    className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBuyTokens}
                                    disabled={isSubmitting || !paymentProof.trim()}
                                    className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            💳 Submit Payment Request
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
