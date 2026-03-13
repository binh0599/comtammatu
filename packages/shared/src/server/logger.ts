/**
 * Structured logging cho Server Actions và API routes.
 * - Production: JSON one-line output (machine-readable)
 * - Development: Pretty human-readable format
 *
 * Không phụ thuộc external dependencies — chỉ sử dụng console.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
    tenantId?: number;
    userId?: string;
    action?: string;
    branchId?: number | null;
    duration_ms?: number;
    [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

function getMinLevel(): number {
    const env = process.env.LOG_LEVEL as LogLevel | undefined;
    if (env && env in LOG_LEVELS) return LOG_LEVELS[env];
    return process.env.NODE_ENV === "production"
        ? LOG_LEVELS.info
        : LOG_LEVELS.debug;
}

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

export interface Logger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
}

/**
 * Tạo logger instance cho một module cụ thể.
 *
 * @example
 * ```ts
 * const log = createLogger("orders");
 * log.info("Đơn hàng được tạo", { action: "createOrder", tenantId: 3 });
 * ```
 */
export function createLogger(module: string): Logger {
    const minLevel = getMinLevel();
    const prod = isProduction();

    function log(
        level: LogLevel,
        message: string,
        context?: LogContext,
    ): void {
        if (LOG_LEVELS[level] < minLevel) return;

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            ...context,
        };

        if (prod) {
            // Production: JSON one-line
            const consoleFn =
                level === "error"
                    ? console.error
                    : level === "warn"
                      ? console.warn
                      : console.log;
            consoleFn(JSON.stringify(entry));
        } else {
            // Development: pretty format
            const prefix = `[${entry.timestamp.slice(11, 23)}] [${level.toUpperCase().padEnd(5)}] [${module}]`;
            const contextStr = context
                ? ` ${Object.entries(context)
                      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                      .join(" ")}`
                : "";
            const consoleFn =
                level === "error"
                    ? console.error
                    : level === "warn"
                      ? console.warn
                      : level === "debug"
                        ? console.debug
                        : console.log;
            consoleFn(`${prefix} ${message}${contextStr}`);
        }
    }

    return {
        debug: (msg, ctx) => log("debug", msg, ctx),
        info: (msg, ctx) => log("info", msg, ctx),
        warn: (msg, ctx) => log("warn", msg, ctx),
        error: (msg, ctx) => log("error", msg, ctx),
    };
}

/** Logger mặc định cho module "app" */
export const logger = createLogger("app");
