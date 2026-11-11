'use client';

import { useEffect } from 'react';
import { captureClientException } from '@/lib/monitoring/sentry-client';
import './globals.css';

// Kök layout'u render eden hata yakalanamazsa Next.js layout'un yerine bunu kullanır;
// bu yüzden kendi <html>/<body>'sini taşır. Tema ve i18n sağlayıcıları burada yoktur.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // digest'li hatalar sunucuda üretilmiştir ve onRequestError ile zaten gönderildi.
        if (!error.digest) {
            captureClientException(error);
        }
    }, [error]);

    return (
        <html lang="en">
            <body className="min-h-screen bg-background text-foreground antialiased">
                <div className="flex min-h-screen flex-col items-center justify-center px-4">
                    <div className="text-center">
                        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground">
                            Something went wrong!
                        </h2>
                        <p className="mb-8 text-muted-foreground">
                            We apologize for the inconvenience. An unexpected error has occurred.
                        </p>
                        <button
                            onClick={() => reset()}
                            className="rounded-lg bg-destructive px-5 py-2.5 text-center text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-4 focus:ring-destructive/40"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
