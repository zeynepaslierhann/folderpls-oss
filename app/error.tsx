'use client';

import { useEffect } from 'react';
import { captureClientException } from '@/lib/monitoring/sentry-client';
import { logger } from '@/lib/logger';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        logger.error('App level error:', error);
        // Hata sınırı istemci render hatasını yutar, Sentry'nin global dinleyicileri görmez.
        // digest'li hatalar sunucuda üretilmiştir ve onRequestError ile zaten gönderildi.
        if (!error.digest) {
            captureClientException(error);
        }
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="text-center">
                <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground">
                    Something went wrong!
                </h2>
                <p className="mb-8 text-muted-foreground">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                <button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    className="rounded-lg bg-destructive px-5 py-2.5 text-center text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-4 focus:ring-destructive/40"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
