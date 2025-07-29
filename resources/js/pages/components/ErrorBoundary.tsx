/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: any;
}

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: any) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        this.setState({
            error,
            errorInfo,
        });

        // Call the onError callback if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error);
            console.error('Error info:', errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                    <div className="p-8 text-center">
                        <div className="mb-4 text-6xl">😵</div>
                        <h1 className="mb-4 text-2xl font-bold text-red-400">
                            Something went wrong!
                        </h1>
                        <p className="mb-6 text-gray-400">
                            We're sorry, but something unexpected happened. Please try refreshing
                            the page.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-4 rounded-lg border border-red-500 bg-gray-800 p-4 text-left">
                                <h3 className="mb-2 font-bold text-red-400">
                                    Error Details (Development)
                                </h3>
                                <p className="mb-2 text-sm text-red-300">
                                    {this.state.error.message}
                                </p>
                                <pre className="max-h-32 overflow-auto text-xs text-gray-300">
                                    {this.state.error.stack}
                                </pre>
                            </div>
                        )}

                        <div className="space-x-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => (window.location.href = '/')}
                                className="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
