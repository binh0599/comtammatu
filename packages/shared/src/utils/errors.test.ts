import { describe, it, expect, vi } from "vitest";
import { ActionError, handleServerActionError, requireRole } from "./errors";
import type { ActionErrorCode } from "./errors";

describe("ActionError", () => {
  it("creates an error with message and code", () => {
    const err = new ActionError("Test error", "VALIDATION_ERROR");
    expect(err.message).toBe("Test error");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.httpStatus).toBe(400);
    expect(err.name).toBe("ActionError");
  });

  it("allows custom httpStatus", () => {
    const err = new ActionError("Forbidden", "UNAUTHORIZED", 403);
    expect(err.httpStatus).toBe(403);
  });

  it("extends Error", () => {
    const err = new ActionError("test", "SERVER_ERROR");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("handleServerActionError", () => {
  it("re-throws errors with digest (Next.js redirects)", () => {
    const err = new Error("redirect");
    (err as { digest?: string }).digest = "NEXT_REDIRECT";

    expect(() => handleServerActionError(err)).toThrow(err);
  });

  it("returns structured response for ActionError", () => {
    const err = new ActionError("Not found", "NOT_FOUND", 404);
    const result = handleServerActionError(err);

    expect(result).toEqual({
      error: "Not found",
      code: "NOT_FOUND",
    });
  });

  it("returns generic message for unknown Error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("db connection failed");
    const result = handleServerActionError(err);

    expect(result.error).toBe("Lỗi hệ thống. Vui lòng thử lại sau.");
    expect(result.code).toBe("SERVER_ERROR");

    vi.restoreAllMocks();
  });

  it("returns generic message for non-Error values", () => {
    const result = handleServerActionError("something weird");

    expect(result.error).toBe("Lỗi không xác định. Vui lòng thử lại sau.");
    expect(result.code).toBe("SERVER_ERROR");
  });
});

describe("requireRole", () => {
  it("does not throw for allowed roles", () => {
    expect(() => requireRole("owner", ["owner", "manager"])).not.toThrow();
  });

  it("throws ActionError for disallowed roles", () => {
    expect(() => requireRole("waiter", ["owner", "manager"])).toThrow(ActionError);
  });

  it("throws with UNAUTHORIZED code", () => {
    try {
      requireRole("chef", ["owner"]);
    } catch (error) {
      expect(error).toBeInstanceOf(ActionError);
      expect((error as ActionError).code).toBe("UNAUTHORIZED");
      expect((error as ActionError).httpStatus).toBe(403);
    }
  });

  it("includes custom operation in message", () => {
    try {
      requireRole("waiter", ["owner"], "quản lý nhân viên");
    } catch (error) {
      expect((error as ActionError).message).toContain("quản lý nhân viên");
    }
  });
});
