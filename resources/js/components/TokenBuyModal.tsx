import React, { useState, useRef } from 'react';
import { FaTimes, FaCoins, FaUpload, FaQrcode } from 'react-icons/fa';

interface TokenBuyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (purchaseData: {
        tokens: number;
        amount: number;
        payment_proof: File | null;
        notes: string;
    }) => void;
}

const TOKEN_PACKAGES = [
    {
        id: 'starter',
        tokens: 10,
        amount: 50,
        pricePerToken: 5,
        color: 'blue',
        popular: false
    },
    {
        id: 'popular',
        tokens: 50,
        amount: 200,
        pricePerToken: 4,
        color: 'green',
        popular: true,
        savings: 50
    },
    {
        id: 'premium',
        tokens: 100,
        amount: 350,
        pricePerToken: 3.5,
        color: 'purple',
        popular: false,
        savings: 150
    },
    {
        id: 'enterprise',
        tokens: 500,
        amount: 1500,
        pricePerToken: 3,
        color: 'yellow',
        popular: false,
        savings: 1000
    }
];

export default function TokenBuyModal({
    isOpen,
    onClose,
    onSubmit
}: TokenBuyModalProps) {
    const [selectedPackage, setSelectedPackage] = useState<typeof TOKEN_PACKAGES[0] | null>(null);
    const [paymentProofImage, setPaymentProofImage] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedPackage) {
            alert('Please select a token package');
            return;
        }

        if (!paymentProofImage) {
            alert('Please upload a payment proof image');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                tokens: selectedPackage.tokens,
                amount: selectedPackage.amount,
                payment_proof: paymentProofImage,
                notes: notes
            });
            onClose();
        } catch (error) {
            console.error('Error submitting token purchase:', error);
            alert('Error submitting token purchase. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePackageSelect = (pkg: typeof TOKEN_PACKAGES[0]) => {
        setSelectedPackage(pkg);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }
            setPaymentProofImage(file);
        }
    };

    const handleRemoveImage = () => {
        setPaymentProofImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
            <div className="relative z-[10000] w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-lg bg-gray-800 overflow-hidden flex flex-col">
                {/* Fixed Header */}
                <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Buy Tokens</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <FaTimes className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Token Packages */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-white">Select Token Package</h3>
                        <div className="space-y-4">
                            {TOKEN_PACKAGES.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                                        selectedPackage?.id === pkg.id
                                            ? `border-${pkg.color}-500 bg-${pkg.color}-900/20`
                                            : `border-gray-600 hover:border-${pkg.color}-400`
                                    } ${pkg.popular ? 'relative' : ''}`}
                                    onClick={() => handlePackageSelect(pkg)}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-2 left-4">
                                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <FaCoins className={`h-5 w-5 text-${pkg.color}-400`} />
                                                <span className="text-lg font-semibold text-white">
                                                    {pkg.tokens} Tokens
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                ฿{pkg.pricePerToken} per token
                                            </div>
                                            {pkg.savings && (
                                                <div className="text-xs text-green-400">
                                                    Save ฿{pkg.savings}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">
                                                ฿{pkg.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-white">Payment Information</h3>
                        
                        {selectedPackage && (
                            <div className="mb-4 rounded-lg bg-gray-700 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-lg font-semibold text-white">
                                            {selectedPackage.tokens} Tokens
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            ฿{selectedPackage.pricePerToken} per token
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-green-400">
                                        ฿{selectedPackage.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bank Account QR Code Section */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <FaQrcode className="h-5 w-5 text-blue-400" />
                                <h4 className="text-lg font-semibold text-white">Payment Instructions</h4>
                            </div>
                            
                            <div className="bg-gray-700 rounded-lg p-4 mb-4">
                                <div className="text-center">
                                    <p className="text-sm text-gray-300 mb-3">
                                        Scan the QR code below to pay with your mobile banking app
                                    </p>
                                    
                                    {showQRCode ? (
                                        <div className="bg-white p-4 rounded-lg inline-block">
                                            <img 
                                                src="/images/bank-qr-code.svg" 
                                                alt="Bank QR Code"
                                                className="w-48 h-48 mx-auto"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const fallback = target.nextElementSibling as HTMLElement;
                                                    if (fallback) fallback.style.display = 'block';
                                                }}
                                            />
                                            <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm" style={{ display: 'none' }}>
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">📱</div>
                                                    <div>QR Code Placeholder</div>
                                                    <div className="text-xs">Bank Account QR</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowQRCode(true)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                                        >
                                            <FaQrcode className="h-4 w-4" />
                                            Show QR Code
                                        </button>
                                    )}
                                    
                                    <div className="mt-4 text-sm text-gray-300">
                                        <p><strong>Bank:</strong> Kasikorn Bank</p>
                                        <p><strong>Account:</strong> 123-4-56789-0</p>
                                        <p><strong>Name:</strong> Chaiyo Irrigation Co., Ltd.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form id="token-purchase-form" onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Upload Payment Proof Image
                                    </label>
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                                        {paymentProofImage ? (
                                            <div className="space-y-3">
                                                <div className="relative inline-block">
                                                    <img 
                                                        src={URL.createObjectURL(paymentProofImage)} 
                                                        alt="Payment proof preview"
                                                        className="max-w-full max-h-48 rounded-lg mx-auto"
                                                    />
                                                </div>
                                                <div className="text-sm text-gray-300">
                                                    <p><strong>File:</strong> {paymentProofImage.name}</p>
                                                    <p><strong>Size:</strong> {(paymentProofImage.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    Remove Image
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <FaUpload className="h-12 w-12 text-gray-400 mx-auto" />
                                                <div>
                                                    <p className="text-gray-300 mb-2">Upload a screenshot of your payment</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                                    >
                                                        Choose Image
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    Supported formats: JPG, PNG, GIF (Max 5MB)
                                                </p>
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Additional Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                        placeholder="Any additional information about your payment..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-700">
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
                            form="token-purchase-form"
                            disabled={!selectedPackage || isSubmitting || !paymentProofImage}
                            className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <FaCoins className="h-4 w-4" />
                                    Submit Payment Request
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
