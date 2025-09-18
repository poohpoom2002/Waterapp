import React from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: (selectedPattern?: 'extending' | 'crossing') => void;
    onCancel?: () => void;
    title: string;
    message: string;
    warningMessage?: string;
    type?: 'info' | 'warning' | 'success' | 'error';
    showConfirmButton?: boolean;
    confirmText?: string;
    cancelText?: string;
    showColorOptions?: boolean;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    title,
    message,
    warningMessage,
    type = 'info',
    showConfirmButton = false,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    showColorOptions = false,
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'warning':
                return <FaExclamationTriangle className="text-yellow-500" size={24} />;
            case 'success':
                return <FaCheckCircle className="text-green-500" size={24} />;
            case 'error':
                return <FaExclamationTriangle className="text-red-500" size={24} />;
            default:
                return <FaInfoCircle className="text-blue-500" size={24} />;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case 'warning':
                return 'text-yellow-800';
            case 'success':
                return 'text-green-800';
            case 'error':
                return 'text-red-800';
            default:
                return 'text-blue-800';
        }
    };

    const getMessageColor = () => {
        switch (type) {
            case 'warning':
                return 'text-yellow-700';
            case 'success':
                return 'text-green-700';
            case 'error':
                return 'text-red-700';
            default:
                return 'text-blue-700';
        }
    };

    const getWarningColor = () => {
        switch (type) {
            case 'warning':
                return 'text-yellow-600 bg-yellow-100';
            case 'success':
                return 'text-green-600 bg-green-100';
            case 'error':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-blue-600 bg-blue-100';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative mx-4 w-full max-w-md rounded-lg border-2 shadow-2xl ${getBackgroundColor()}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className={`text-lg font-bold ${getTitleColor()}`}>{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 transition-colors hover:text-gray-600"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className={`mb-3 text-sm ${getMessageColor()}`}>{message}</p>

                    {showColorOptions && (
                        <div className="mb-4">
                            <div className="grid grid-cols-2 gap-3">
                                {/* สีเหลือง - แยกเส้นซ้าย-ขวา */}
                                <button
                                    onClick={() => onConfirm?.('extending')}
                                    className="flex items-center gap-3 rounded-lg border-2 border-yellow-300 p-3 transition-colors hover:bg-yellow-50"
                                >
                                    <div className="h-6 w-6 rounded-full border-2 border-white bg-yellow-500 shadow-sm"></div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-800">
                                            แยกเส้นซ้าย-ขวา
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            ออกจากท่อเมนย่อยด้านใดด้านหนึ่ง
                                        </div>
                                    </div>
                                </button>

                                {/* สีเขียว - ลากผ่านเส้นเดียว */}
                                <button
                                    onClick={() => onConfirm?.('crossing')}
                                    className="flex items-center gap-3 rounded-lg border-2 border-green-300 p-3 transition-colors hover:bg-green-50"
                                >
                                    <div className="h-6 w-6 rounded-full border-2 border-white bg-green-500 shadow-sm"></div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-800">
                                            ลากผ่านเส้นเดียว
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            ลากผ่านท่อเมนย่อย
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {warningMessage && (
                        <div className={`rounded-lg p-3 text-sm font-medium ${getWarningColor()}`}>
                            <div className="flex items-start gap-2">
                                <FaExclamationTriangle className="mt-0.5 flex-shrink-0" size={16} />
                                <span>{warningMessage}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {showConfirmButton && !showColorOptions && (
                    <div className="flex gap-3 border-t border-gray-200 p-4">
                        <button
                            onClick={onCancel || onClose}
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => onConfirm?.()}
                            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                                type === 'warning'
                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                    : type === 'success'
                                      ? 'bg-green-600 hover:bg-green-700'
                                      : type === 'error'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                )}

                {/* Footer for color options - only show cancel button */}
                {showColorOptions && (
                    <div className="flex gap-3 border-t border-gray-200 p-4">
                        <button
                            onClick={onCancel || onClose}
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            {cancelText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationModal;
