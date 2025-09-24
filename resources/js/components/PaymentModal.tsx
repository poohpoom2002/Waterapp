import React, { useState } from 'react';
import { FaTimes, FaCreditCard, FaCheck } from 'react-icons/fa';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planType: 'pro' | 'advanced';
    months: number;
    amount: number;
    tokens: number;
    onSubmit: (paymentData: {
        plan_type: string;
        months: number;
        payment_proof: string;
        notes: string;
    }) => void;
}

export default function PaymentModal({
    isOpen,
    onClose,
    planType,
    months,
    amount,
    tokens,
    onSubmit
}: PaymentModalProps) {
    const [paymentProof, setPaymentProof] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentProof.trim()) {
            alert('Please provide payment proof');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                plan_type: planType,
                months: months,
                payment_proof: paymentProof.trim(),
                notes: notes.trim()
            });
            onClose();
        } catch (error) {
            console.error('Error submitting payment:', error);
            alert('Error submitting payment request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Payment Request</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-6 rounded-lg bg-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <FaCreditCard className="h-6 w-6 text-blue-400" />
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
                            <div className="text-2xl font-bold text-white">฿{amount.toLocaleString()}</div>
                            <div className="text-sm text-gray-400">Total Amount</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{tokens.toLocaleString()}</div>
                            <div className="text-sm text-gray-400">Tokens</div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Payment Proof *
                        </label>
                        <textarea
                            value={paymentProof}
                            onChange={(e) => setPaymentProof(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder="Please provide payment details (bank transfer reference, screenshot, etc.)"
                            rows={3}
                            required
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Include bank transfer reference, screenshot, or other payment proof
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
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

                    <div className="mb-4 rounded-lg bg-yellow-900/30 border border-yellow-600 p-3">
                        <div className="flex items-start gap-2">
                            <FaCheck className="h-4 w-4 text-yellow-400 mt-0.5" />
                            <div className="text-sm text-yellow-200">
                                <p className="font-medium">Payment Process:</p>
                                <p>1. Make payment to our bank account</p>
                                <p>2. Submit this form with payment proof</p>
                                <p>3. Wait for admin approval (usually within 24 hours)</p>
                                <p>4. Tokens will be added to your account</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!paymentProof.trim() || isSubmitting}
                            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <FaCreditCard className="h-4 w-4" />
                                    Submit Payment Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
