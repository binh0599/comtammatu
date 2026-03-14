/**
 * Error reporting abstraction.
 *
 * Mặc định: ghi log qua structured logger.
 * Khi tích hợp Sentry: gọi `configureErrorReporter()` với Sentry adapter.
 *
 * @example
 * ```ts
 * // Sử dụng mặc định (logger)
 * errorReporter.captureException(new Error("Lỗi"));
 *
 * // Tích hợp Sentry (khi sẵn sàng)
 * import * as Sentry from "@sentry/nextjs";
 * configureErrorReporter({
 *   captureException: (err, ctx) => Sentry.captureException(err, { extra: ctx }),
 *   captureMessage: (msg, level) => Sentry.captureMessage(msg, level),
 *   setUser: (user) => Sentry.setUser(user),
 * });
 * ```
 */

import { createLogger, type LogContext } from "./logger";

const log = createLogger("error-reporter");

export interface ErrorReporter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: "info" | "warning" | "error"): void;
  setUser(user: { id: string; role?: string; tenantId?: number }): void;
}

/** Default reporter — ghi log, không gửi đi đâu cả */
function createDefaultReporter(): ErrorReporter {
  let currentUser: { id: string; role?: string; tenantId?: number } | null = null;

  return {
    captureException(error: Error, context?: Record<string, unknown>): void {
      const ctx: LogContext = {
        ...context,
        errorName: error.name,
        stack: error.stack?.split("\n").slice(0, 3).join(" → "),
      };
      if (currentUser) {
        ctx.userId = currentUser.id;
        ctx.userRole = currentUser.role;
        ctx.tenantId = currentUser.tenantId;
      }
      log.error(error.message, ctx);
    },

    captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
      const ctx: LogContext = {};
      if (currentUser) {
        ctx.userId = currentUser.id;
        ctx.tenantId = currentUser.tenantId;
      }
      if (level === "error") {
        log.error(message, ctx);
      } else if (level === "warning") {
        log.warn(message, ctx);
      } else {
        log.info(message, ctx);
      }
    },

    setUser(user: { id: string; role?: string; tenantId?: number }): void {
      currentUser = user;
    },
  };
}

let _reporter: ErrorReporter = createDefaultReporter();

/**
 * Thay đổi error reporter (ví dụ: khi tích hợp Sentry).
 * Gọi một lần trong app bootstrap.
 */
export function configureErrorReporter(reporter: ErrorReporter): void {
  _reporter = reporter;
}

/** Error reporter singleton — sử dụng trực tiếp trong code */
export const errorReporter: ErrorReporter = {
  captureException(error, context) {
    _reporter.captureException(error, context);
  },
  captureMessage(message, level) {
    _reporter.captureMessage(message, level);
  },
  setUser(user) {
    _reporter.setUser(user);
  },
};
