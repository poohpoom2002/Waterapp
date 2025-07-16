import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: 'blue' | 'green' | 'red' | 'gray' | 'white';
    text?: string;
    fullScreen?: boolean;
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    color = 'blue',
    text,
    fullScreen = false,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    const colorClasses = {
        blue: 'border-blue-500',
        green: 'border-green-500',
        red: 'border-red-500',
        gray: 'border-gray-500',
        white: 'border-white',
    };

    const textColorClasses = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        red: 'text-red-400',
        gray: 'text-gray-400',
        white: 'text-white',
    };

    const spinnerElement = (
        <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
            <div
                className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
                role="status"
                aria-label="Loading"
            >
                <span className="sr-only">Loading...</span>
            </div>
            {text && <p className={`text-sm font-medium ${textColorClasses[color]}`}>{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
                <div className="rounded-lg bg-gray-800 p-8 shadow-xl">{spinnerElement}</div>
            </div>
        );
    }

    return spinnerElement;
};

export default LoadingSpinner;
