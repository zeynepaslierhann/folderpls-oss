'use client';

import React from 'react';
import { AlertIcon } from '@/components/icons';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Panel hata kalıbı (spec §4.3): boş durumla aynı yerleşim, ikon
            // --danger, tek primary eylem; giriş animasyonu yok.
            return (
                <div role="alert" className="flex flex-1 items-center justify-center px-4 py-16">
                    <div className="flex max-w-[360px] flex-col items-center text-center">
                        <AlertIcon className="mb-3 h-8 w-8 text-danger" aria-hidden="true" />
                        <h2 className="text-lg font-semibold text-fg">Something went wrong</h2>
                        <p className="mt-1 text-sm text-fg-2">
                            We apologize for the inconvenience. Please try refreshing the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-[0.875rem] font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
