import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/errors";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";

describe("applyServerValidationErrors", () => {
  it("maps server field errors to form errors", () => {
    const setError = vi.fn();

    const handled = applyServerValidationErrors(
      setError,
      new ApiError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        fieldErrors: {
          display_name: ["Display name is required"]
        }
      }),
      {
        display_name: "displayName"
      }
    );

    expect(handled).toBe(true);
    expect(setError).toHaveBeenCalledWith("displayName", {
      type: "server",
      message: "Display name is required"
    });
  });

  it("returns false when no field errors exist", () => {
    const setError = vi.fn();

    const handled = applyServerValidationErrors(
      setError,
      new ApiError({
        status: 500,
        code: "SERVER_ERROR",
        message: "Server error"
      })
    );

    expect(handled).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});

describe("getFormErrorMessage", () => {
  it("returns API message when available", () => {
    const message = getFormErrorMessage(
      new ApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "Forbidden"
      }),
      "Fallback"
    );

    expect(message).toBe("Forbidden");
  });

  it("returns fallback for unknown errors", () => {
    const message = getFormErrorMessage(new Error("x"), "Fallback");
    expect(message).toBe("Fallback");
  });
});
