import React, { useState } from 'react';

interface Payment {
    id: number;
    user_id: number;
    plan_type: string;
    months: number;
    amount: number;
    currency: string;
    tokens_purchased: number;
    status: 'pending' | 'approved' | 'rejected';
    payment_proof?: string;
    notes?: string;
    admin_notes?: string;
    approved_by?: number;
    approved_at?: string;
    created_at: string;
    updated_at: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    approver?: {
        id: number;
        name: string;
        email: string;
    };
}

interface PaymentReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment;
    onApprove: (paymentId: number, adminNotes?: string) => void;
    onReject: (paymentId: number, adminNotes: string) => void;
    t: (key: string) => string;
}

export default function PaymentReviewModal({
    isOpen,
    onClose,
    payment,
    onApprove,
    onReject,
    t,
}: PaymentReviewModalProps) {
    const [adminNotes, setAdminNotes] = useState('');
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate admin notes for rejection
        if (action === 'reject' && !adminNotes.trim()) {
            alert('Please provide admin notes when rejecting a payment.');
            return;
        }
        
        if (action === 'approve') {
            onApprove(payment.id, adminNotes);
        } else if (action === 'reject') {
            onReject(payment.id, adminNotes);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-2xl rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Review Payment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg
                            className="h-6 w-6"
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

                <div className="mb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">User Information</h3>
                            <p className="text-gray-300">{payment.user.name}</p>
                            <p className="text-sm text-gray-400">{payment.user.email}</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Payment Details</h3>
                            <p className="text-gray-300">฿{payment.amount.toLocaleString()}</p>
                            <p className="text-sm text-gray-400">
                                {payment.plan_type === 'token_purchase' 
                                    ? 'TOKEN PURCHASE' 
                                    : `${payment.plan_type.toUpperCase()} - ${payment.months} month${payment.months > 1 ? 's' : ''}`
                                }
                            </p>
                            <p className="text-sm text-blue-400">
                                {payment.tokens_purchased.toLocaleString()} tokens
                            </p>
                        </div>
                    </div>

                    {payment.notes && (
                        <div>
                            <h3 className="text-lg font-semibold text-white">User Notes</h3>
                            <p className="text-gray-300">{payment.notes}</p>
                        </div>
                    )}

                    {payment.payment_proof && (
                        <div>
                            <h3 className="text-lg font-semibold text-white">Payment Proof</h3>
                            <p className="text-gray-300">{payment.payment_proof}</p>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-semibold text-white">Admin Notes</h3>
                        <p className="text-sm text-gray-400 mb-2">
                            {action === 'reject' ? 'Required when rejecting a payment' : 'Optional when approving a payment'}
                        </p>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={action === 'reject' ? 'Please explain why this payment is being rejected...' : 'Add notes about this payment review...'}
                            rows={3}
                            required={action === 'reject'}
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => setAction('reject')}
                            className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                        >
                            Reject Payment
                        </button>
                        <button
                            type="button"
                            onClick={() => setAction('approve')}
                            className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                        >
                            Approve Payment
                        </button>
                    </div>

                    {action && (
                        <div className="mt-4 rounded-lg bg-gray-700 p-4">
                            <p className="text-white">
                                Are you sure you want to {action} this payment?
                            </p>
                            <div className="mt-3 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setAction(null)}
                                    className="rounded px-3 py-1 text-gray-300 transition-colors hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`rounded px-3 py-1 text-white transition-colors ${
                                        action === 'approve' 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
