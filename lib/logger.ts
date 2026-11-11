type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugMode = typeof window !== 'undefined'
    ? localStorage.getItem('debug_mode') === 'true'
    : false;

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
    /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT tokens
    /-----BEGIN[A-Z ]+KEY-----[\s\S]*?-----END[A-Z ]+KEY-----/g, // Private keys
    /AIza[0-9A-Za-z_-]{35}/g, // Google API keys
    /ya29\.[0-9A-Za-z_-]+/g, // Google OAuth access tokens
    /1\/\/[0-9A-Za-z_-]+/g, // Google refresh tokens
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email addresses (optional)
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUIDs (user IDs)
];

class Logger {
    /**
     * Sanitize sensitive data from log messages
     * In production: redacts tokens, keys, emails, etc.
     * In development: shows full data for debugging
     */
    private sanitize(value: unknown): unknown {
        // In development, allow full logging
        if (isDevelopment) {
            return value;
        }

        if (typeof value === 'string') {
            let sanitized = value;
            for (const pattern of SENSITIVE_PATTERNS) {
                sanitized = sanitized.replace(pattern, '[REDACTED]');
            }
            return sanitized;
        }

        if (value instanceof Error) {
            return {
                name: value.name,
                message: this.sanitize(value.message) as string,
                // Stack frames are code paths, not user data; still sanitized.
                stack: value.stack ? (this.sanitize(value.stack.split('\n').slice(0, 6).join('\n')) as string) : undefined,
            };
        }

        if (Array.isArray(value)) {
            return value.map(item => this.sanitize(item));
        }

        if (value && typeof value === 'object') {
            const sanitized: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value)) {
                // Redact sensitive field names entirely
                const sensitiveFields = [
                    'password', 'token', 'accessToken', 'refreshToken',
                    'idToken', 'privateKey', 'secret', 'apiKey', 'key',
                    'authorization', 'cookie', 'session'
                ];
                if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitize(val);
                }
            }
            return sanitized;
        }

        return value;
    }

    private logToConsole(level: LogLevel, message: string, args: unknown[], alwaysVisible = false) {
        // Tarayıcıda (istemci) kullanıcıya hiçbir log gösterme
        const runningInBrowser = typeof window !== 'undefined';
        if (runningInBrowser) return;
        // Production server: warn/error always reach the platform logs (already
        // sanitized below) — silencing them hid every API failure. info/debug
        // stay off unless debug mode is enabled; `notice()` is the explicit
        // opt-in that keeps a routine success line (e.g. a daily cron's
        // "ran fine") visible at info severity without crying wolf as a warning.
        if (isProduction && !isDebugMode && !alwaysVisible && (level === 'info' || level === 'debug')) {
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        // Sanitize message and args
        const sanitizedMessage = this.sanitize(message) as string;
        const sanitizedArgs = args.map(arg => this.sanitize(arg));

        switch (level) {
            case 'info':
                console.info(prefix, sanitizedMessage, ...sanitizedArgs);
                break;
            case 'warn':
                console.warn(prefix, sanitizedMessage, ...sanitizedArgs);
                break;
            case 'error':
                console.error(prefix, sanitizedMessage, ...sanitizedArgs);
                break;
            case 'debug':
                console.debug(prefix, sanitizedMessage, ...sanitizedArgs);
                break;
        }
    }

    info(message: string, ...args: unknown[]) {
        this.logToConsole('info', message, args);
    }

    /**
     * Info severity that is ALSO written in production. For rare, low-volume
     * "it ran and all is well" lines (daily cron heartbeat) whose absence from
     * the platform logs would be the signal. Do not use on hot paths.
     */
    notice(message: string, ...args: unknown[]) {
        this.logToConsole('info', message, args, true);
    }

    warn(message: string, ...args: unknown[]) {
        this.logToConsole('warn', message, args);
    }

    error(message: string, ...args: unknown[]) {
        this.logToConsole('error', message, args);
    }

    debug(message: string, ...args: unknown[]) {
        this.logToConsole('debug', message, args);
    }

    /**
     * Log with explicit context - useful for structured logging
     * Example: logger.withContext('Auth', 'Login attempt', { userId: '123' })
     */
    withContext(context: string, message: string, data?: Record<string, unknown>) {
        const sanitizedData = data ? this.sanitize(data) : undefined;
        this.info(`[${context}] ${message}`, sanitizedData);
    }

    /**
     * Log auth events with automatic sensitive data redaction
     */
    auth(event: string, success: boolean, details?: Record<string, unknown>) {
        const sanitizedDetails = details ? this.sanitize(details) : {};
        this.info(`[Auth] ${event}`, { success, ...sanitizedDetails as object });
    }

    /**
     * Log API events
     */
    api(endpoint: string, method: string, status: number, details?: Record<string, unknown>) {
        const sanitizedDetails = details ? this.sanitize(details) : {};
        this.info(`[API] ${method} ${endpoint}`, { status, ...sanitizedDetails as object });
    }
}

export const logger = new Logger();
