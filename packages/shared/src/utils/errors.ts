/**
 * Standardized error handling for Server Actions.
 * All Server Actions should use ActionError for throwing
 * and handleServerActionError for catching.
 */

export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR";

/**
 * Standard error class for Server Actions.
 * Ensures all errors have a consistent shape with error codes.
 */
export class ActionError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: ActionErrorCode,
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Standard result shape returned by all Server Actions.
 */
export type ActionResult<T = void> =
  | ({ error: null } & T)
  | { error: string; code: ActionErrorCode };

/**
 * Handle any error thrown during a Server Action.
 * Returns a standardized response shape for client consumption.
 *
 * Usage:
 * ```ts
 * export async function myAction(data: unknown) {
 *   try {
 *     return await _myAction(data);
 *   } catch (error) {
 *     return handleServerActionError(error);
 *   }
 * }
 * ```
 */
export function handleServerActionError(error: unknown): {
  error: string;
  code: ActionErrorCode;
} {
  // Next.js redirect()/notFound() throw errors with a `digest` property — re-throw them
  if (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string"
  ) {
    throw error;
  }

  // Handle our custom ActionError
  if (error instanceof ActionError) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  // Handle generic errors — don't expose internals
  if (error instanceof Error) {
    // Log for server-side debugging
    console.error("[ServerAction]", error.message);
    return {
      error: "Lỗi hệ thống. Vui lòng thử lại sau.",
      code: "SERVER_ERROR",
    };
  }

  return {
    error: "Lỗi không xác định. Vui lòng thử lại sau.",
    code: "SERVER_ERROR",
  };
}

/**
 * Create a safe ActionError from a database/Supabase error.
 * Logs the real error server-side but returns a generic message to the client.
 */
export function safeDbError(
  error: { message: string; code?: string },
  context: string
): ActionError {
  console.error(`[${context}]`, error.message, error.code ?? "");
  return new ActionError("Lỗi hệ thống. Vui lòng thử lại sau.", "SERVER_ERROR", 500);
}

/**
 * Return a safe error object from a database/Supabase error.
 * Logs the real error server-side but returns a generic message to the client.
 */
export function safeDbErrorResult(
  error: { message: string; code?: string },
  context: string
): { error: string } {
  console.error(`[${context}]`, error.message, error.code ?? "");
  return { error: "Lỗi hệ thống. Vui lòng thử lại sau." };
}

/**
 * Validate role against allowed roles. Throws ActionError if insufficient.
 */
export function requireRole(
  userRole: string,
  allowedRoles: readonly string[],
  operation: string = "thao tác này"
): void {
  if (!allowedRoles.includes(userRole)) {
    throw new ActionError(`Bạn không có quyền ${operation}`, "UNAUTHORIZED", 403);
  }
}
