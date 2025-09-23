import React, { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

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
    user: User;
    approver?: User;
}

interface PaymentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment;
    onUpdate: (paymentId: number, updateData: {
        status: string;
        admin_notes?: string;
        force_remove_tokens?: boolean;
    }) => void;
    t: (key: string) => string;
}

export default function PaymentEditModal({
    isOpen,
    onClose,
    payment,
    onUpdate,
    t,
}: PaymentEditModalProps) {
    const [status, setStatus] = useState(payment.status);
    const [adminNotes, setAdminNotes] = useState(payment.admin_notes || '');
    const [forceRemoveTokens, setForceRemoveTokens] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate admin notes for rejection
        if (status === 'rejected' && !adminNotes.trim()) {
            alert('Please provide admin notes when rejecting a payment.');
            return;
        }
        
        setLoading(true);
        try {
            await onUpdate(payment.id, {
                status,
                admin_notes: adminNotes.trim() || undefined,
                force_remove_tokens: forceRemoveTokens
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStatus(payment.status);
        setAdminNotes(payment.admin_notes || '');
        setForceRemoveTokens(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-2xl rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Edit Payment</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white">
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
                        <h3 className="text-lg font-semibold text-white">Payment Status</h3>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-white">Admin Notes</h3>
                        <p className="text-sm text-gray-400 mb-2">
                            {status === 'rejected' ? 'Required when rejecting a payment' : 'Optional notes about this payment'}
                        </p>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={status === 'rejected' ? 'Please explain why this payment is being rejected...' : 'Add notes about this payment...'}
                            rows={3}
                            required={status === 'rejected'}
                        />
                    </div>

                    {/* Force Remove Tokens Option - Only show when changing from approved to non-approved */}
                    {payment.status === 'approved' && status !== 'approved' && (
                        <div className="rounded-lg border border-yellow-500 bg-yellow-900/20 p-4">
                            <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Token Removal Warning</h3>
                            <p className="text-sm text-yellow-200 mb-3">
                                This user received {payment.tokens_purchased} tokens from this payment. 
                                If they have already spent some tokens, removing them may result in a negative balance.
                            </p>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={forceRemoveTokens}
                                    onChange={(e) => setForceRemoveTokens(e.target.checked)}
                                    className="mr-2 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm text-yellow-200">
                                    Force remove tokens even if user has insufficient balance (can result in negative balance)
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (status === 'rejected' && !adminNotes.trim())}
                            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Update Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
