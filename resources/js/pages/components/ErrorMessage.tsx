import React from 'react';

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    type?: 'error' | 'warning' | 'info';
    className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
    title,
    message,
    onRetry,
    onDismiss,
    type = 'error',
    className = '',
}) => {
    const typeStyles = {
        error: {
            bg: 'bg-red-50 border-red-200',
            text: 'text-red-800',
            titleText: 'text-red-900',
            icon: '❌',
            buttonBg: 'bg-red-600 hover:bg-red-700',
        },
        warning: {
            bg: 'bg-yellow-50 border-yellow-200',
            text: 'text-yellow-800',
            titleText: 'text-yellow-900',
            icon: '⚠️',
            buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            text: 'text-blue-800',
            titleText: 'text-blue-900',
            icon: 'ℹ️',
            buttonBg: 'bg-blue-600 hover:bg-blue-700',
        },
    };

    const style = typeStyles[type];

    return (
        <div className={`rounded-lg border p-4 ${style.bg} ${className}`}>
            <div className="flex items-start">
                <div className="mr-3 flex-shrink-0">
                    <span className="text-xl">{style.icon}</span>
                </div>
                <div className="flex-1">
                    {title && (
                        <h3 className={`text-sm font-medium ${style.titleText} mb-1`}>{title}</h3>
                    )}
                    <p className={`text-sm ${style.text}`}>{message}</p>
                </div>
                {onDismiss && (
                    <div className="ml-3 flex-shrink-0">
                        <button
                            onClick={onDismiss}
                            className={`inline-flex rounded-md p-1.5 ${style.text} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                        >
                            <span className="sr-only">Dismiss</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            {onRetry && (
                <div className="mt-4">
                    <button
                        onClick={onRetry}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${style.buttonBg}`}
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default ErrorMessage;
