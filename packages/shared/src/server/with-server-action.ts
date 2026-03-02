/**
 * Higher-order function to wrap Server Actions with standardized error handling.
 * Eliminates the need for repetitive try/catch boilerplate in every exported action.
 *
 * Handles:
 * - Re-throwing Next.js redirect/notFound errors (have `digest` property)
 * - Converting ActionError to standardized response
 * - Catching generic errors with safe user-facing message
 *
 * @example
 * ```ts
 * async function _createCustomer(formData: FormData) { ... }
 * export const createCustomer = withServerAction(_createCustomer);
 * ```
 */

import { handleServerActionError } from "../utils/errors";

/**
 * Wraps a Server Action implementation with error handling.
 * Use for actions that return a result (mutations, creates, etc.).
 */
export function withServerAction<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult | { error: string; code: string }> {
    return async (...args: TArgs) => {
        try {
            return await fn(...args);
        } catch (error) {
            if (
                error instanceof Error &&
                "digest" in error &&
                typeof (error as { digest?: string }).digest === "string"
            ) {
                throw error;
            }
            return handleServerActionError(error);
        }
    };
}

/**
 * Wraps a Server Action that fetches data (queries).
 * Re-throws all errors so the page/component can handle them.
 */
export function withServerQuery<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs) => {
        try {
            return await fn(...args);
        } catch (error) {
            if (
                error instanceof Error &&
                "digest" in error &&
                typeof (error as { digest?: string }).digest === "string"
            ) {
                throw error;
            }
            const result = handleServerActionError(error);
            throw new Error(result.error);
        }
    };
}
